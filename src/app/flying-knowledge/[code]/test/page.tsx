import { randomUUID } from "node:crypto";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { TestRunner } from "@/components/practice-test/runner";
import { EmptyState, PageHeading } from "@/components/ui";
import { findSession, getSessionAnswers } from "@/db/attempts";
import {
  countFlyingKnowledgeTestQuestions,
  getFlyingKnowledgeAnswerKey,
  getFlyingKnowledgeSubject,
  getFlyingKnowledgeTestQuestionsByIds,
  pickFlyingKnowledgeTestQuestions,
  pickUnseenFlyingKnowledgeTestQuestions,
  type FlyingKnowledgeTestQuestion,
} from "@/db/flying-knowledge-queries";
import { getFlaggedQuestionIdSet, getFlaggedQuestionIds } from "@/db/flags";
import { getQuestionIdsToRetry } from "@/db/reports";
import { getSiteSettings, overrideItem } from "@/db/settings";
import { getCurrentUser } from "@/lib/auth/session";
import type { AnswerVerdict } from "@/lib/practice-test-types";
import {
  buildFlyingKnowledgeTestHref,
  DEFAULT_TEST_MODE,
  parseTestLength,
  deadlineFrom,
  parseTestMode,
  parseTopics,
  resolveTestSize,
  timeLimitFor,
} from "@/lib/test-options";

import { answerQuestion, loadNote, reportQuestion, saveNote, submitTest, toggleFlag } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{
    questions?: string | string[];
    from?: string | string[];
    topic?: string | string[];
    mode?: string | string[];
    t?: string | string[];
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return { title: `${code.toUpperCase()} practice quiz` };
}

function redirectWithFreshId(code: string, query: Awaited<PageProps["searchParams"]>): never {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const v of Array.isArray(value) ? value : [value]) if (v) params.append(key, v);
  }
  params.set("t", randomUUID());
  redirect(`/flying-knowledge/${code}/test?${params.toString()}`);
}

/**
 * A Flying Knowledge subject's test runner — the same page as
 * `type-rating/[code]/test/page.tsx` and `class-rating/[code]/test/page.tsx`,
 * reading from the subject content tables instead. See the note atop
 * `flying-knowledge/[code]/test/actions.ts` for the one real difference: no
 * free-tier cap and no signed-out preview cap ever shrink the test this page
 * builds, because Flying Knowledge is free in full. `resolveTestSize` is
 * applied against how many questions exist, exactly as elsewhere — the
 * removed step is the allowance clamp that follows it on the other two
 * pages, not the size resolution itself.
 *
 * "Unseen", "flagged" and "retry" presets are supported here exactly as on
 * the other two pages — `getQuestionIdsToRetry` and `getFlaggedQuestionIds`
 * already read straight from `attempts`/`question_flags` with no join to
 * `questions`, so they work unchanged for a subject code too.
 */
export default async function FlyingKnowledgeTestPage({ params, searchParams }: PageProps) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const subjectCode = code.toUpperCase();

  const rawId = Array.isArray(query.t) ? query.t[0] : query.t;
  if (!rawId) redirectWithFreshId(code, query);
  const clientTestId = rawId;

  const length = parseTestLength(query.questions);
  let mode = parseTestMode(query.mode);
  const fromPreset = Array.isArray(query.from) ? query.from[0] : query.from;
  const retryOnly = fromPreset === "incorrect";
  const flaggedOnly = fromPreset === "flagged";
  const unseenOnly = fromPreset === "unseen";
  let topics = retryOnly || flaggedOnly ? [] : parseTopics(query.topic);

  let subject;
  let questions: FlyingKnowledgeTestQuestion[];
  let initialAnswers: Record<string, string> = {};
  let initialVerdicts: Record<string, AnswerVerdict> = {};
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let initialStartedAt: string | null = null;
  let initialExpiresAt: string | null = null;

  try {
    subject = await getFlyingKnowledgeSubject(subjectCode).then((row) => overrideItem("flying-knowledge", row));
    if (!subject) notFound();

    user = await getCurrentUser();

    const lookup = user
      ? await findSession(user.id, subjectCode, clientTestId)
      : { kind: "none" as const };

    if (lookup.kind === "taken") redirectWithFreshId(code, query);

    if (lookup.kind === "resumable") {
      mode = lookup.mode ?? DEFAULT_TEST_MODE;
      topics = lookup.topics;

      questions = await getFlyingKnowledgeTestQuestionsByIds(subjectCode, lookup.questionIds);
      const saved = await getSessionAnswers(lookup.id);
      initialAnswers = Object.fromEntries(
        Object.entries(saved).filter((entry): entry is [string, string] => entry[1] !== null),
      );

      if (lookup.startedAt) {
        initialStartedAt = lookup.startedAt.toISOString();
        if (lookup.timeLimitSeconds !== null) {
          initialExpiresAt = deadlineFrom(lookup.startedAt, lookup.timeLimitSeconds).toISOString();
        }
      }

      const answeredIds = mode === "study" ? Object.keys(initialAnswers) : [];
      if (answeredIds.length > 0) {
        const key = await getFlyingKnowledgeAnswerKey(subjectCode, answeredIds);
        initialVerdicts = Object.fromEntries(
          key.map((question) => [
            question.id,
            {
              isCorrect: initialAnswers[question.id] === question.correct,
              correctOptionId: question.correct,
              explanation: question.explanation,
              reference: question.reference,
            },
          ]),
        );
      }
    } else {
      questions = [];
    }

    if (questions.length === 0) {
      const available = await countFlyingKnowledgeTestQuestions(subjectCode, topics);
      const size = resolveTestSize(length, available);

      if (retryOnly) {
        const ids = user ? await getQuestionIdsToRetry(user.id, subjectCode, size) : [];
        questions = ids.length > 0 ? await getFlyingKnowledgeTestQuestionsByIds(subjectCode, ids) : [];
      } else if (flaggedOnly) {
        const ids = user ? (await getFlaggedQuestionIds(user.id, subjectCode)).slice(0, size) : [];
        questions = ids.length > 0 ? await getFlyingKnowledgeTestQuestionsByIds(subjectCode, ids) : [];
      } else if (size === 0) {
        questions = [];
      } else if (unseenOnly && user) {
        questions = await pickUnseenFlyingKnowledgeTestQuestions(subjectCode, user.id, size, topics);
      } else {
        questions = await pickFlyingKnowledgeTestQuestions(subjectCode, size, topics);
      }
    }
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_")) throw error;
    return (
      <>
        <PageHeading title={`${subjectCode} practice quiz`} />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  if (questions.length === 0) {
    const sections = topics.length > 0 ? topics.join(", ") : null;
    return (
      <>
        <PageHeading title={`${subject.name} practice quiz`} />
        <EmptyState
          title={
            retryOnly
              ? "Nothing to retry right now."
              : flaggedOnly
                ? "You haven't flagged any questions yet."
                : unseenOnly
                  ? `You've seen every published question on ${subject.code}.`
                  : sections
                    ? `There are no published questions in ${sections} yet.`
                    : "There are no published questions for this subject yet."
          }
        >
          {retryOnly ? (
            <>
              The last time you saw each question, you got it right.{" "}
              <Link
                href={buildFlyingKnowledgeTestHref(subject.code)}
                className="font-medium text-brand-ink hover:underline"
              >
                Take a normal quiz
              </Link>{" "}
              instead.
            </>
          ) : flaggedOnly ? (
            <>
              Flag a question mid-quiz to come back to it later.{" "}
              <Link
                href={buildFlyingKnowledgeTestHref(subject.code)}
                className="font-medium text-brand-ink hover:underline"
              >
                Take a normal quiz
              </Link>{" "}
              instead.
            </>
          ) : unseenOnly ? (
            <>
              That is every question in this subject, at least once.{" "}
              <Link
                href={buildFlyingKnowledgeTestHref(subject.code)}
                className="font-medium text-brand-ink hover:underline"
              >
                Take a normal quiz
              </Link>{" "}
              to go over them again.
            </>
          ) : sections ? (
            <>
              Check the topic name, or{" "}
              <Link
                href={`/flying-knowledge/${subject.code}`}
                className="font-medium text-brand-ink hover:underline"
              >
                choose different topics
              </Link>
              .
            </>
          ) : (
            <Link
              href={`/flying-knowledge/${subject.code}`}
              className="font-medium text-brand-ink hover:underline"
            >
              Back to {subject.code}
            </Link>
          )}
        </EmptyState>
      </>
    );
  }

  let initialFlaggedIds: string[] = [];
  if (user) {
    try {
      initialFlaggedIds = [
        ...(await getFlaggedQuestionIdSet(
          user.id,
          questions.map((question) => question.id),
        )),
      ];
    } catch {
      // Left empty — flagging is a convenience layered on top of the test,
      // not part of it.
    }
  }

  const settings = await getSiteSettings();

  return (
    <TestRunner
      aircraftCode={subject.code}
      aircraftName={subject.name}
      questions={questions}
      topics={topics}
      actions={{ answerQuestion, submitTest, toggleFlag, saveNote, loadNote, reportQuestion }}
      backHref={`/flying-knowledge/${subject.code}`}
      basePath="/flying-knowledge"
      clientTestId={clientTestId}
      initialAnswers={initialAnswers}
      initialVerdicts={initialVerdicts}
      mode={mode}
      timeLimitSeconds={timeLimitFor(mode, questions.length)}
      initialStartedAt={initialStartedAt}
      initialExpiresAt={initialExpiresAt}
      isSignedIn={user !== null}
      initialFlaggedIds={initialFlaggedIds}
      passMarkPercent={settings.passMarkPercent}
    />
  );
}
