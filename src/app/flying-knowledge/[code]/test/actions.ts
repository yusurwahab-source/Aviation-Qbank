"use server";

import { z } from "zod";

import { recordTestResult, saveAnswer as saveAnswerRow } from "@/db/attempts";
import { getFlyingKnowledgeAnswerKey } from "@/db/flying-knowledge-queries";
import { toggleQuestionFlag } from "@/db/flags";
import { getQuestionNote, saveQuestionNote } from "@/db/notes";
import { createQuestionReport } from "@/db/question-reports";
import { checkPreviewAllowed, recordPreviewRequest } from "@/db/login-attempts";
import { getClientIp } from "@/lib/auth/client-ip";
import { getCurrentUser } from "@/lib/auth/session";
import { describeWait } from "@/lib/auth/rate-limit-policy";
import { gradeTest, type TestResult } from "@/lib/grading";
import type {
  AnswerQuestionInput,
  AnswerQuestionResult,
  AnswerSaveStatus,
  AnswerVerdict,
  PracticeTestResult,
  SaveStatus,
  SubmitTestInput,
} from "@/lib/practice-test-types";
import { TEST_MODES, deadlineFrom, timeLimitFor } from "@/lib/test-options";

/**
 * Grading for a Flying Knowledge subject's test — a third mirror of
 * `type-rating/[code]/test/actions.ts` and `class-rating/[code]/test/actions.ts`.
 * The field named `aircraftCode` throughout this file (and in the shared UI
 * it serves) holds a subject code here, not an aircraft's; see the note on
 * `flyingKnowledgeSubjects` in `db/schema.ts` for why that reuse is
 * intentional rather than a leak.
 *
 * What is genuinely different from the other two, rather than merely
 * renamed: **there is no paywall and no preview allowance here at all.**
 * Flying Knowledge is free in full, by product decision — see the note on
 * the three sections in `CLAUDE.md` — so this file never calls
 * `db/subscriptions.ts` or `db/preview.ts`, never withholds an answer key,
 * and `submitTest` never returns a `withheld` count. The only thing a
 * signed-out caller is still checked against is `RATE_LIMIT_RULES.previewPerIp`
 * (via `checkPreviewAllowed`/`recordPreviewRequest`, reused from the preview
 * flow) — purely to protect the server from a scripted flood, the same
 * "protect the machine, not the product" reasoning `MAX_ANSWERS` already
 * gives elsewhere. It is never used to limit how much of the bank a visitor
 * may see, and no `preview_attempts` row is ever written for a Flying
 * Knowledge answer.
 *
 * Resuming, per-answer recording, flags, notes and reports are all the
 * identical rule the other two files enforce, because it is built on
 * exactly the same tables (`attempts`, `question_flags`, `question_notes`,
 * `question_reports`), which know nothing about which content table a code
 * came from.
 */

const MAX_ANSWERS = 5000;

const submissionSchema = z.object({
  aircraftCode: z.string().regex(/^[A-Z][A-Z0-9]{1,7}$/),
  clientTestId: z.string().min(8).max(64),
  answers: z
    .array(
      z.object({
        questionId: z.string().max(40),
        selectedOptionId: z.string().max(4).nullable(),
      }),
    )
    .min(1)
    .max(MAX_ANSWERS),
});

export async function submitTest(input: SubmitTestInput): Promise<PracticeTestResult> {
  const { aircraftCode: subjectCode, clientTestId, answers } = submissionSchema.parse(input);

  const key = await getFlyingKnowledgeAnswerKey(
    subjectCode,
    answers.map((answer) => answer.questionId),
  );

  if (key.length === 0) {
    throw new Error("Those questions could not be found. Please start a new test.");
  }

  const keyById = new Map(key.map((question) => [question.id, question]));
  const ordered = answers
    .map((answer) => keyById.get(answer.questionId))
    .filter((question) => question !== undefined);

  const result = gradeTest(subjectCode, ordered, answers);

  return {
    ...result,
    saveStatus: await record(clientTestId, result),
    // Never withheld: Flying Knowledge is free in full, so every caller is
    // entitled to the whole answer key on every test.
    withheld: null,
  };
}

async function record(clientTestId: string, result: TestResult): Promise<SaveStatus> {
  try {
    const user = await getCurrentUser();
    if (!user) return "signed-out";

    const outcome = await recordTestResult(user.id, clientTestId, result);
    return outcome.status === "duplicate" ? "already-saved" : "saved";
  } catch (error) {
    console.error("Failed to record test result:", error);
    return "failed";
  }
}

const answerSchema = z.object({
  aircraftCode: z.string().regex(/^[A-Z][A-Z0-9]{1,7}$/),
  clientTestId: z.string().min(8).max(64),
  questionIds: z.array(z.string().max(40)).min(1).max(MAX_ANSWERS),
  questionId: z.string().max(40),
  selectedOptionId: z.string().max(4),
  mode: z.enum(TEST_MODES),
  topics: z.array(z.string().max(60)).max(50).default([]),
});

export async function answerQuestion(input: AnswerQuestionInput): Promise<AnswerQuestionResult> {
  try {
    const {
      aircraftCode: subjectCode,
      clientTestId,
      questionIds,
      questionId,
      selectedOptionId,
      mode,
      topics,
    } = answerSchema.parse(input);

    const timeLimitSeconds = timeLimitFor(mode, questionIds.length);

    const [question] = await getFlyingKnowledgeAnswerKey(subjectCode, [questionId]);
    if (!question) return { status: "invalid" };

    const isCorrect = selectedOptionId === question.correct;
    const verdict: AnswerVerdict | null =
      mode === "study"
        ? {
            isCorrect,
            correctOptionId: question.correct,
            explanation: question.explanation,
            reference: question.reference,
          }
        : null;

    const user = await getCurrentUser();
    if (!user) {
      // No allowance to check — Flying Knowledge is free in full — but a
      // signed-out caller is still rate limited, purely to protect the
      // server from a scripted flood. See the note atop this file.
      const ip = await getClientIp();
      const allowed = await checkPreviewAllowed(ip);
      if (!allowed.allowed) {
        return { status: "rate-limited", retryAfter: describeWait(allowed.retryAfterMs) };
      }
      await recordPreviewRequest(ip);

      return { status: "answered", verdict, saved: "signed-out", startedAt: null, expiresAt: null };
    }

    let saved: AnswerSaveStatus;
    let startedAt: string | null = null;
    let expiresAt: string | null = null;
    try {
      const outcome = await saveAnswerRow({
        userId: user.id,
        clientTestId,
        aircraftCode: subjectCode,
        questionIds,
        questionCount: questionIds.length,
        questionId,
        topic: question.topic,
        selectedOptionId,
        isCorrect,
        timeLimitSeconds,
        mode,
        topics,
      });

      if (outcome.status === "recorded") {
        saved = "recorded";
        if (outcome.startedAt) {
          startedAt = outcome.startedAt.toISOString();
          if (outcome.timeLimitSeconds !== null) {
            expiresAt = deadlineFrom(outcome.startedAt, outcome.timeLimitSeconds).toISOString();
          }
        }
      } else if (outcome.status === "closed") {
        saved = "closed";
      } else {
        saved = "failed";
      }
    } catch (error) {
      console.error("Failed to save an answer:", error);
      saved = "failed";
    }

    return { status: "answered", verdict, saved, startedAt, expiresAt };
  } catch (error) {
    console.error("Failed to answer a question:", error);
    return { status: "failed" };
  }
}

const flagSchema = z.object({
  questionId: z.string().max(40),
  aircraftCode: z.string().regex(/^[A-Z][A-Z0-9]{1,7}$/),
});

export async function toggleFlag(
  input: z.infer<typeof flagSchema>,
): Promise<{ flagged: boolean } | { status: "signed-out" | "failed" }> {
  try {
    const { questionId, aircraftCode: subjectCode } = flagSchema.parse(input);
    const user = await getCurrentUser();
    if (!user) return { status: "signed-out" };

    return await toggleQuestionFlag(user.id, questionId, subjectCode);
  } catch (error) {
    console.error("Failed to toggle a flag:", error);
    return { status: "failed" };
  }
}

const noteSchema = z.object({
  questionId: z.string().max(40),
  aircraftCode: z.string().regex(/^[A-Z][A-Z0-9]{1,7}$/),
  body: z.string().max(4000),
});

export async function saveNote(
  input: z.infer<typeof noteSchema>,
): Promise<{ status: "saved" | "signed-out" | "failed" }> {
  try {
    const { questionId, aircraftCode: subjectCode, body } = noteSchema.parse(input);
    const user = await getCurrentUser();
    if (!user) return { status: "signed-out" };

    await saveQuestionNote(user.id, questionId, subjectCode, body);
    return { status: "saved" };
  } catch (error) {
    console.error("Failed to save a note:", error);
    return { status: "failed" };
  }
}

export async function loadNote(questionId: string): Promise<string> {
  try {
    const user = await getCurrentUser();
    if (!user) return "";
    return (await getQuestionNote(user.id, questionId.slice(0, 40))) ?? "";
  } catch (error) {
    console.error("Failed to load a note:", error);
    return "";
  }
}

const REPORT_REASONS = ["wrong_answer", "unclear", "typo", "outdated", "other"] as const;

const reportSchema = z.object({
  questionId: z.string().max(40),
  reason: z.enum(REPORT_REASONS),
  comment: z.string().max(1000),
});

export async function reportQuestion(
  input: z.infer<typeof reportSchema>,
): Promise<{ status: "reported" | "failed" }> {
  try {
    const { questionId, reason, comment } = reportSchema.parse(input);
    const user = await getCurrentUser();

    await createQuestionReport({
      questionId,
      userId: user?.id ?? null,
      reason,
      comment: comment.trim() === "" ? null : comment.trim(),
    });

    return { status: "reported" };
  } catch (error) {
    console.error("Failed to record a question report:", error);
    return { status: "failed" };
  }
}
