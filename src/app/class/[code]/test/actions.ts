"use server";

import { z } from "zod";

import { recordTestResult, saveAnswer as saveAnswerRow } from "@/db/attempts";
import { getClassAnswerKey } from "@/db/class-queries";
import { toggleQuestionFlag } from "@/db/flags";
import { getQuestionNote, saveQuestionNote } from "@/db/notes";
import { createQuestionReport } from "@/db/question-reports";
import {
  answeredQuestionIdsAmong,
  countQuestionsAnswered,
  getSubscription,
  hasAnsweredQuestionBefore,
} from "@/db/subscriptions";
import { checkPreviewAllowed, recordPreviewRequest } from "@/db/login-attempts";
import {
  countPreviewQuestionsAnswered,
  hasPreviewedQuestion,
  previewedQuestionIdsAmong,
  recordPreviewAnswer,
  recordPreviewAnswers,
} from "@/db/preview";
import { getSiteSettings } from "@/db/settings";
import { getClientIp } from "@/lib/auth/client-ip";
import { ensurePreviewVisitorId } from "@/lib/auth/preview-visitor";
import { getCurrentUser } from "@/lib/auth/session";
import { describeWait } from "@/lib/auth/rate-limit-policy";
import {
  canAnswerQuestion,
  hasActiveSubscription,
  remainingFreeQuestions,
} from "@/lib/billing/access-policy";
import { gradeTest, withholdAnswerKey, type TestResult } from "@/lib/grading";
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
 * Grading for a class rating's test — the class-content mirror of
 * `aircraft/[code]/test/actions.ts`. The field named `aircraftCode`
 * throughout this file (and in the shared UI it serves) holds a class
 * rating's code here, not an aircraft's; see the note on `classRatings` in
 * `db/schema.ts` for why that reuse is intentional rather than a leak. Every
 * rule below — the answer key never arriving before it is earned, the free
 * tier, the preview allowance, resuming, the paywall — is the identical rule
 * `aircraft/[code]/test/actions.ts` enforces, because it is built on exactly
 * the same tables (`attempts`, `subscriptions`, `preview_attempts`, …),
 * which know nothing about which content table a code came from.
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
  const { aircraftCode: classCode, clientTestId, answers } = submissionSchema.parse(input);

  const key = await getClassAnswerKey(
    classCode,
    answers.map((answer) => answer.questionId),
  );

  if (key.length === 0) {
    throw new Error("Those questions could not be found. Please start a new test.");
  }

  const keyById = new Map(key.map((question) => [question.id, question]));
  const ordered = answers
    .map((answer) => keyById.get(answer.questionId))
    .filter((question) => question !== undefined);

  const result = gradeTest(classCode, ordered, answers);

  const entitlement = await entitledAnswerKeyIds(
    classCode,
    result.graded.map((entry) => entry.question.id),
  );
  const withheldResult = withholdAnswerKey(result, entitlement.ids);
  const withheldCount = withheldResult.graded.filter((entry) => entry.withheld).length;

  return {
    ...withheldResult,
    saveStatus: await record(clientTestId, result),
    withheld:
      withheldCount > 0 && entitlement.reason !== null
        ? { count: withheldCount, reason: entitlement.reason }
        : null,
  };
}

/** Same rule as `entitledAnswerKeyIds` in the aircraft actions — see its
 * comment there for the full reasoning; nothing here differs but which
 * table the answer key and the allowance are read against. */
async function entitledAnswerKeyIds(
  classCode: string,
  questionIds: string[],
): Promise<{ ids: Set<string>; reason: "preview" | "free-tier" | null }> {
  const all = (): { ids: Set<string>; reason: null } => ({
    ids: new Set(questionIds),
    reason: null,
  });

  try {
    const user = await getCurrentUser();

    if (user) {
      const subscription = await getSubscription(user.id);
      if (hasActiveSubscription(subscription)) return all();

      const [alreadyAnswered, distinctAnswered, settings] = await Promise.all([
        answeredQuestionIdsAmong(user.id, questionIds),
        countQuestionsAnswered(user.id, classCode),
        getSiteSettings(),
      ]);

      const ids = extendWithinAllowance(
        questionIds,
        alreadyAnswered,
        remainingFreeQuestions(distinctAnswered, settings.freeQuestionsPerAircraft),
      );
      return { ids, reason: "free-tier" };
    }

    const ip = await getClientIp();
    const allowed = await checkPreviewAllowed(ip);
    if (!allowed.allowed) return { ids: new Set(), reason: "preview" };
    await recordPreviewRequest(ip);

    const visitorId = await ensurePreviewVisitorId();
    const settings = await getSiteSettings();
    const [alreadyPreviewed, previewed] = await Promise.all([
      previewedQuestionIdsAmong(visitorId, questionIds),
      countPreviewQuestionsAnswered(visitorId, classCode),
    ]);

    const ids = extendWithinAllowance(
      questionIds,
      alreadyPreviewed,
      remainingFreeQuestions(previewed, settings.previewQuestionsSignedOut),
    );

    const newlySpent = [...ids].filter((id) => !alreadyPreviewed.has(id));
    await recordPreviewAnswers(visitorId, classCode, newlySpent);

    return { ids, reason: "preview" };
  } catch (error) {
    console.error("Failed to decide answer-key entitlement:", error);
    return { ids: new Set(), reason: null };
  }
}

function extendWithinAllowance(
  questionIds: string[],
  alreadyEntitled: Set<string>,
  remaining: number,
): Set<string> {
  const ids = new Set(alreadyEntitled);
  let budget = Math.max(0, remaining);

  for (const questionId of questionIds) {
    if (budget === 0) break;
    if (ids.has(questionId)) continue;
    ids.add(questionId);
    budget -= 1;
  }

  return ids;
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
      aircraftCode: classCode,
      clientTestId,
      questionIds,
      questionId,
      selectedOptionId,
      mode,
      topics,
    } = answerSchema.parse(input);

    const timeLimitSeconds = timeLimitFor(mode, questionIds.length);

    const [question] = await getClassAnswerKey(classCode, [questionId]);
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
      const ip = await getClientIp();

      const allowed = await checkPreviewAllowed(ip);
      if (!allowed.allowed) {
        return { status: "rate-limited", retryAfter: describeWait(allowed.retryAfterMs) };
      }
      await recordPreviewRequest(ip);

      const visitorId = await ensurePreviewVisitorId();
      const settings = await getSiteSettings();
      const [alreadyPreviewed, previewed] = await Promise.all([
        hasPreviewedQuestion(visitorId, questionId),
        countPreviewQuestionsAnswered(visitorId, classCode),
      ]);

      const mayPreview = canAnswerQuestion({
        hasSubscription: false,
        alreadyAnsweredThisQuestion: alreadyPreviewed,
        distinctAnsweredSoFar: previewed,
        limit: settings.previewQuestionsSignedOut,
      });
      if (!mayPreview) return { status: "preview-exhausted" };

      await recordPreviewAnswer(visitorId, questionId, classCode);

      return { status: "answered", verdict, saved: "signed-out", startedAt: null, expiresAt: null };
    }

    const subscription = await getSubscription(user.id);
    if (!hasActiveSubscription(subscription)) {
      const [alreadyAnswered, distinctAnswered, settings] = await Promise.all([
        hasAnsweredQuestionBefore(user.id, questionId),
        countQuestionsAnswered(user.id, classCode),
        getSiteSettings(),
      ]);
      const allowed = canAnswerQuestion({
        hasSubscription: false,
        alreadyAnsweredThisQuestion: alreadyAnswered,
        distinctAnsweredSoFar: distinctAnswered,
        limit: settings.freeQuestionsPerAircraft,
      });
      if (!allowed) return { status: "paywall" };
    }

    let saved: AnswerSaveStatus;
    let startedAt: string | null = null;
    let expiresAt: string | null = null;
    try {
      const outcome = await saveAnswerRow({
        userId: user.id,
        clientTestId,
        aircraftCode: classCode,
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
    const { questionId, aircraftCode: classCode } = flagSchema.parse(input);
    const user = await getCurrentUser();
    if (!user) return { status: "signed-out" };

    return await toggleQuestionFlag(user.id, questionId, classCode);
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
    const { questionId, aircraftCode: classCode, body } = noteSchema.parse(input);
    const user = await getCurrentUser();
    if (!user) return { status: "signed-out" };

    await saveQuestionNote(user.id, questionId, classCode, body);
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
