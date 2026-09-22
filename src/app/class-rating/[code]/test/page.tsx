import { randomUUID } from "node:crypto";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { TestRunner } from "@/components/practice-test/runner";
import { EmptyState, PageHeading } from "@/components/ui";
import { findSession, getSessionAnswers } from "@/db/attempts";
import {
  countClassTestQuestions,
  getClassAnswerKey,
  getClassRating,
  getClassTestQuestionsByIds,
  pickClassTestQuestions,
  pickUnseenClassTestQuestions,
  type ClassTestQuestion,
} from "@/db/class-queries";
import { getFlaggedQuestionIdSet, getFlaggedQuestionIds } from "@/db/flags";
import { getQuestionIdsToRetry } from "@/db/reports";
import { countPreviewQuestionsAnswered } from "@/db/preview";
import { countQuestionsAnswered, getSubscription } from "@/db/subscriptions";
import { hasActiveSubscription, remainingFreeQuestions } from "@/lib/billing/access-policy";
import { getSiteSettings } from "@/db/settings";
import { getPreviewVisitorId } from "@/lib/auth/preview-visitor";
import { getCurrentUser } from "@/lib/auth/session";
import type { AnswerVerdict } from "@/lib/practice-test-types";
import {
  buildClassTestHref,
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
  return { title: `${code.toUpperCase()} practice test` };
}

function redirectWithFreshId(code: string, query: Awaited<PageProps["searchParams"]>): never {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const v of Array.isArray(value) ? value : [value]) if (v) params.append(key, v);
  }
  params.set("t", randomUUID());
  redirect(`/class-rating/${code}/test?${params.toString()}`);
}

/**
 * A class rating's test runner — the same page as
 * `type-rating/[code]/test/page.tsx`, reading from the class content tables
 * instead. See the note atop `class-rating/[code]/test/actions.ts` for why
 * every rule here (resume, the free tier, the preview allowance, the clock)
 * is identical rather than reimplemented: it is the same `attempts` row and
 * the same `subscriptions` row either way, and neither table knows which
 * content tree a code came from.
 *
 * "Unseen", "flagged" and "retry" presets are supported here exactly as on
 * the type rating page — `getQuestionIdsToRetry` and `getFlaggedQuestionIds`
 * already read straight from `attempts`/`question_flags` with no join to
 * `questions`, so they work unchanged for a class code too.
 */
export default async function ClassTestPage({ params, searchParams }: PageProps) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const classCode = code.toUpperCase();

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

  let ratingClass;
  let questions: ClassTestQuestion[];
  let initialAnswers: Record<string, string> = {};
  let initialVerdicts: Record<string, AnswerVerdict> = {};
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let initialStartedAt: string | null = null;
  let initialExpiresAt: string | null = null;
  let freeLimitReached = false;
  let previewLimitReached = false;

  try {
    ratingClass = await getClassRating(classCode);
    if (!ratingClass) notFound();

    user = await getCurrentUser();

    const lookup = user ? await findSession(user.id, classCode, clientTestId) : { kind: "none" as const };

    if (lookup.kind === "taken") redirectWithFreshId(code, query);

    if (lookup.kind === "resumable") {
      mode = lookup.mode ?? DEFAULT_TEST_MODE;
      topics = lookup.topics;

      questions = await getClassTestQuestionsByIds(classCode, lookup.questionIds);
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
        const key = await getClassAnswerKey(classCode, answeredIds);
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
      const available = await countClassTestQuestions(classCode, topics);
      let size = resolveTestSize(length, available);

      if (retryOnly) {
        const ids = user ? await getQuestionIdsToRetry(user.id, classCode, size) : [];
        questions = ids.length > 0 ? await getClassTestQuestionsByIds(classCode, ids) : [];
      } else if (flaggedOnly) {
        const ids = user ? (await getFlaggedQuestionIds(user.id, classCode)).slice(0, size) : [];
        questions = ids.length > 0 ? await getClassTestQuestionsByIds(classCode, ids) : [];
      } else {
        if (user) {
          const subscription = await getSubscription(user.id);
          if (!hasActiveSubscription(subscription)) {
            const [distinctAnswered, settings] = await Promise.all([
              countQuestionsAnswered(user.id, classCode),
              getSiteSettings(),
            ]);
            size = Math.min(size, remainingFreeQuestions(distinctAnswered, settings.freeQuestionsPerAircraft));
            freeLimitReached = size === 0 && available > 0;
          }
        } else {
          const [visitorId, settings] = await Promise.all([
            getPreviewVisitorId(),
            getSiteSettings(),
          ]);
          const previewed = visitorId
            ? await countPreviewQuestionsAnswered(visitorId, classCode)
            : 0;
          size = Math.min(
            size,
            remainingFreeQuestions(previewed, settings.previewQuestionsSignedOut),
          );
          previewLimitReached = size === 0 && available > 0;
        }
        if (size === 0) {
          questions = [];
        } else if (unseenOnly && user) {
          questions = await pickUnseenClassTestQuestions(classCode, user.id, size, topics);
        } else {
          questions = await pickClassTestQuestions(classCode, size, topics);
        }
      }
    }
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_")) throw error;
    return (
      <>
        <PageHeading title={`${classCode} practice test`} />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  if (questions.length === 0) {
    const sections = topics.length > 0 ? topics.join(", ") : null;
    return (
      <>
        <PageHeading title={`${ratingClass.name} practice test`} />
        <EmptyState
          title={
            freeLimitReached
              ? `You've used your free questions on ${ratingClass.code}.`
              : previewLimitReached
                ? `That's the ${ratingClass.code} preview. Create a free account to keep going.`
                : retryOnly
                ? "Nothing to retry right now."
                : flaggedOnly
                  ? "You haven't flagged any questions yet."
                  : unseenOnly
                    ? `You've seen every published question on ${ratingClass.code}.`
                    : sections
                      ? `There are no published questions in ${sections} yet.`
                      : "There are no published questions for this class yet."
          }
        >
          {freeLimitReached ? (
            <>
              Subscribe for unlimited questions on every aircraft and class.{" "}
              <Link href="/upgrade" className="font-medium text-brand hover:underline">
                Upgrade
              </Link>
            </>
          ) : previewLimitReached ? (
            <>
              Signing up is free and gives you more questions, plus your results, flags and
              notes.{" "}
              <Link href="/signup" className="font-medium text-brand hover:underline">
                Create an account
              </Link>
            </>
          ) : retryOnly ? (
            <>
              The last time you saw each question, you got it right.{" "}
              <Link
                href={buildClassTestHref(ratingClass.code)}
                className="font-medium text-brand hover:underline"
              >
                Take a normal test
              </Link>{" "}
              instead.
            </>
          ) : flaggedOnly ? (
            <>
              Flag a question mid-test to come back to it later.{" "}
              <Link
                href={buildClassTestHref(ratingClass.code)}
                className="font-medium text-brand hover:underline"
              >
                Take a normal test
              </Link>{" "}
              instead.
            </>
          ) : unseenOnly ? (
            <>
              That is every question in this class, at least once.{" "}
              <Link
                href={buildClassTestHref(ratingClass.code)}
                className="font-medium text-brand hover:underline"
              >
                Take a normal test
              </Link>{" "}
              to go over them again.
            </>
          ) : sections ? (
            <>
              Check the section name, or{" "}
              <Link
                href={`/class-rating/${ratingClass.code}`}
                className="font-medium text-brand hover:underline"
              >
                choose different sections
              </Link>
              .
            </>
          ) : (
            <Link href={`/class-rating/${ratingClass.code}`} className="font-medium text-brand hover:underline">
              Back to {ratingClass.code}
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
      aircraftCode={ratingClass.code}
      aircraftName={ratingClass.name}
      questions={questions}
      topics={topics}
      actions={{ answerQuestion, submitTest, toggleFlag, saveNote, loadNote, reportQuestion }}
      backHref={`/class-rating/${ratingClass.code}`}
      basePath="/class-rating"
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
