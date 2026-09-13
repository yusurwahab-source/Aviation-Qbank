import { randomUUID } from "node:crypto";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { EmptyState, PageHeading } from "@/components/ui";
import { findSession, getSessionAnswers } from "@/db/attempts";
import {
  countTestQuestions,
  getAircraft,
  getAnswerKey,
  getTestQuestionsByIds,
  pickTestQuestions,
  type TestQuestion,
} from "@/db/queries";
import { getQuestionIdsToRetry } from "@/db/reports";
import { getCurrentUser } from "@/lib/auth/session";
import {
  buildTestHref,
  parseTestLength,
  parseTestMode,
  parseTopics,
  resolveTestSize,
} from "@/lib/test-options";

import type { AnswerVerdict } from "./actions";
import { TestRunner } from "./test-runner";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{
    questions?: string | string[];
    from?: string | string[];
    topic?: string | string[];
    /** `study` (default) marks as you go; `exam` holds it all to the end. */
    mode?: string | string[];
    /** Identifies this attempt at the test. See the note below `TestPage`. */
    t?: string | string[];
  }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return { title: `${code.toUpperCase()} practice test` };
}

/** Redirects to this same test page, replacing `t` with a freshly minted id. */
function redirectWithFreshId(code: string, query: Awaited<PageProps["searchParams"]>): never {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const v of Array.isArray(value) ? value : [value]) if (v) params.append(key, v);
  }
  params.set("t", randomUUID());
  redirect(`/aircraft/${code}/test?${params.toString()}`);
}

/**
 * Every test the student takes is identified by `?t=`, a random id that
 * `clientTestId` has always been — the only change is that it now lives in
 * the URL instead of being minted silently inside the browser. That is what
 * makes a test resumable: reloading the page carries the same `t`, so a
 * signed-in user's answers so far can be read back and the same questions
 * re-shown, rather than drawing a fresh random set and losing them.
 *
 * A visit with no `t` at all — the normal case, arriving from the aircraft
 * page or a retry link — redirects once to add a freshly minted one. That
 * redirect is unconditional and happens before any database read, so it
 * costs nothing when the database is unreachable and cannot be confused with
 * the "questions not found" case below.
 */
export default async function TestPage({ params, searchParams }: PageProps) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const aircraftCode = code.toUpperCase();

  const rawId = Array.isArray(query.t) ? query.t[0] : query.t;
  if (!rawId) redirectWithFreshId(code, query);
  const clientTestId = rawId;

  const length = parseTestLength(query.questions);
  const mode = parseTestMode(query.mode);
  const retryOnly = (Array.isArray(query.from) ? query.from[0] : query.from) === "incorrect";
  // Retry mode already narrows the set, so sections on top of it would be two
  // filters fighting; the retry list wins.
  const topics = retryOnly ? [] : parseTopics(query.topic);

  let plane;
  let questions: TestQuestion[];
  let initialAnswers: Record<string, string> = {};
  let initialVerdicts: Record<string, AnswerVerdict> = {};

  try {
    plane = await getAircraft(aircraftCode);
    if (!plane) notFound();

    const user = await getCurrentUser();

    // A signed-in student resumes an in-progress test under this id rather
    // than drawing a new random set — that is what a mid-test refresh does
    // now. `findSession` also protects against reusing an id that already
    // names a *finished* test: reusing it would collide with that row's
    // unique index and make every new answer silently fail to save, so this
    // id is retired and a fresh one takes over instead.
    const lookup = user ? await findSession(user.id, aircraftCode, clientTestId) : { kind: "none" as const };

    if (lookup.kind === "taken") redirectWithFreshId(code, query);

    if (lookup.kind === "resumable") {
      questions = await getTestQuestionsByIds(aircraftCode, lookup.questionIds);
      const saved = await getSessionAnswers(lookup.id);
      // A row here is only ever written by an actual selection — an
      // in-progress session's attempts are never unanswered placeholders —
      // but the type is nullable, so narrow it rather than assert it.
      initialAnswers = Object.fromEntries(
        Object.entries(saved).filter((entry): entry is [string, string] => entry[1] !== null),
      );

      // These questions have already been answered once, and — in study mode
      // — their answers already shown, so sending the key for *these* gives
      // nothing away that the student has not already seen and paid for.
      // Only these: the ones still to come are fetched without it, as always.
      // In exam mode nothing has been revealed yet, so nothing is sent.
      const answeredIds = mode === "study" ? Object.keys(initialAnswers) : [];
      if (answeredIds.length > 0) {
        const key = await getAnswerKey(aircraftCode, answeredIds);
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

    // Either there was nothing to resume, or the resumed session's questions
    // have since been unpublished out from under it — fall back to a fresh
    // pick exactly as before. This cannot loop: a fresh pick never resumes.
    if (questions.length === 0) {
      // How many questions the chosen sections actually hold. This is what
      // turns "all questions" into a number, and what stops a request for
      // 500 from meaning anything more than the bank.
      const available = await countTestQuestions(aircraftCode, topics);
      const size = resolveTestSize(length, available);

      // Only the question and its options cross to the browser. The correct
      // answer and the explanation stay on the server until the test is graded.
      if (retryOnly) {
        // Retry mode needs an account, because it is built from that
        // account's history. Signed out there is nothing to retry, so fall
        // back to a normal random test rather than showing an error.
        const ids = user ? await getQuestionIdsToRetry(user.id, aircraftCode, size) : [];
        questions = ids.length > 0 ? await getTestQuestionsByIds(aircraftCode, ids) : [];
      } else {
        questions = await pickTestQuestions(aircraftCode, size, topics);
      }
    }
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_")) throw error;
    return (
      <>
        <PageHeading title={`${aircraftCode} practice test`} />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  if (questions.length === 0) {
    const sections = topics.length > 0 ? topics.join(", ") : null;
    return (
      <>
        <PageHeading title={`${plane.name} practice test`} />
        <EmptyState
          title={
            retryOnly
              ? "Nothing to retry right now."
              : sections
                ? `There are no published questions in ${sections} yet.`
                : "There are no published questions for this aircraft yet."
          }
        >
          {retryOnly ? (
            <>
              The last time you saw each question, you got it right.{" "}
              <Link
                href={buildTestHref(plane.code)}
                className="font-medium text-brand hover:underline"
              >
                Take a normal test
              </Link>{" "}
              instead.
            </>
          ) : sections ? (
            <>
              Check the section name, or{" "}
              <Link
                href={`/aircraft/${plane.code}`}
                className="font-medium text-brand hover:underline"
              >
                choose different sections
              </Link>
              .
            </>
          ) : (
            <Link href={`/aircraft/${plane.code}`} className="font-medium text-brand hover:underline">
              Back to {plane.code}
            </Link>
          )}
        </EmptyState>
      </>
    );
  }

  return (
    <TestRunner
      aircraftCode={plane.code}
      aircraftName={plane.name}
      questions={questions}
      topics={topics}
      clientTestId={clientTestId}
      initialAnswers={initialAnswers}
      initialVerdicts={initialVerdicts}
      mode={mode}
    />
  );
}
