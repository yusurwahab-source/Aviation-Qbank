import { randomUUID } from "node:crypto";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { EmptyState, PageHeading } from "@/components/ui";
import { findSession, getSessionAnswers } from "@/db/attempts";
import { getFlaggedQuestionIdSet, getFlaggedQuestionIds } from "@/db/flags";
import {
  countTestQuestions,
  getAircraft,
  getAnswerKey,
  getTestQuestionsByIds,
  listTopics,
  pickTestQuestions,
  pickUnseenTestQuestions,
  type TestQuestion,
} from "@/db/queries";
import { getQuestionIdsToRetry } from "@/db/reports";
import { countQuestionsAnswered, getSubscription } from "@/db/subscriptions";
import { getUserPlanState } from "@/db/users";
import { hasActiveSubscription, remainingFreeQuestions } from "@/lib/billing/access-policy";
import {
  capQuestionCount,
  examModeAllowed,
  isPremiumUser,
  resolveAllowedTopics,
  smartTestAllowed,
} from "@/lib/billing/plan-access";
import { getSiteSettings } from "@/db/settings";
import { getCurrentUser } from "@/lib/auth/session";
import {
  buildTestHref,
  DEFAULT_TEST_MODE,
  parseTestLength,
  deadlineFrom,
  parseTestMode,
  parseTopics,
  resolveTestSize,
  timeLimitFor,
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
  // `let`, not `const`: a resumed test overrides both from the stored
  // session rather than trusting the URL — see the note where that happens,
  // below. Until then these are simply what a fresh test reads from `?mode=`
  // and `?topic=`, same as always.
  let mode = parseTestMode(query.mode);
  const fromPreset = Array.isArray(query.from) ? query.from[0] : query.from;
  const retryOnly = fromPreset === "incorrect";
  const flaggedOnly = fromPreset === "flagged";
  const unseenOnly = fromPreset === "unseen";
  // Any preset already narrows the set on its own, so sections on top of one
  // would be two filters fighting — the preset wins, same reasoning retry
  // mode already followed on its own.
  let topics = retryOnly || flaggedOnly ? [] : parseTopics(query.topic);

  let plane;
  let questions: TestQuestion[];
  let initialAnswers: Record<string, string> = {};
  let initialVerdicts: Record<string, AnswerVerdict> = {};
  // Declared outside the try block: needed afterwards both for the flagged
  // set below and for whether the runner shows flag/note controls at all.
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  /**
   * The clock as the server holds it, for a resumed test. This is the whole
   * point of storing `startedAt`: a reload re-reads the original clock
   * instead of starting a new one. `initialExpiresAt` is null in study mode,
   * which counts up from `initialStartedAt` and has nothing to run out of.
   */
  let initialStartedAt: string | null = null;
  let initialExpiresAt: string | null = null;
  /**
   * Set when a fresh pick was cut down to zero specifically by the free-tier
   * allowance, not because the bank itself is empty — the empty state below
   * needs to tell those two apart rather than saying "no questions" to a
   * student who has simply used theirs up.
   */
  let freeLimitReached = false;
  /**
   * Whether this visitor's *fresh* test may draw from every section, run
   * unlimited length, and use exam mode / the smart-test presets — the
   * free/premium tier from `src/config/plans.ts`. Signed out counts as
   * free: gating by section and by feature is not the same thing as the
   * free-question *allowance*, which only ever applied to a signed-in
   * account — see `remainingFree` above and the note on `FREE_SYSTEMS` in
   * `config/plans.ts`. Deliberately not applied to a *resumed* session,
   * for the same reason the free-question-allowance cap already exempts
   * one: those questions were already sent, and there is nothing left to
   * protect by re-checking a decision already made.
   */
  let isPremium = false;

  try {
    plane = await getAircraft(aircraftCode);
    if (!plane) notFound();

    user = await getCurrentUser();
    if (user) {
      const [subscription, planState] = await Promise.all([
        getSubscription(user.id),
        getUserPlanState(user.id),
      ]);
      isPremium = isPremiumUser({ plan: planState, subscription });
    }
    if (mode === "exam" && !examModeAllowed(isPremium)) mode = "study";

    // A signed-in student resumes an in-progress test under this id rather
    // than drawing a new random set — that is what a mid-test refresh does
    // now. `findSession` also protects against reusing an id that already
    // names a *finished* test: reusing it would collide with that row's
    // unique index and make every new answer silently fail to save, so this
    // id is retired and a fresh one takes over instead.
    const lookup = user ? await findSession(user.id, aircraftCode, clientTestId) : { kind: "none" as const };

    if (lookup.kind === "taken") redirectWithFreshId(code, query);

    if (lookup.kind === "resumable") {
      // The stored session wins over the URL from here on. This is not
      // cosmetic: `mode` below decides whether already-answered questions'
      // keys get sent back a few lines down, and a resume link that lost its
      // `mode=exam` would otherwise be read as study and hand back an exam
      // session's answers as if nothing had ever been withheld. See the note
      // on `SessionLookup.mode` in `db/attempts.ts`.
      mode = lookup.mode ?? DEFAULT_TEST_MODE;
      topics = lookup.topics;

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
      if (lookup.startedAt) {
        initialStartedAt = lookup.startedAt.toISOString();
        // The limit the session was created with, not one recomputed from
        // today's bank: a resumed exam keeps the clock it started on.
        if (lookup.timeLimitSeconds !== null) {
          initialExpiresAt = deadlineFrom(lookup.startedAt, lookup.timeLimitSeconds).toISOString();
        }
      }

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
      // "Questions I got wrong" and "My flagged questions" are both
      // smart-test presets — built from the student's own history rather
      // than a section pick — so a free account never reaches either
      // branch below; it falls through to a normal random pick over its
      // accessible sections instead, the same graceful degradation a
      // signed-out visitor already gets from both (neither has anything to
      // build the preset from either).
      const retryAllowed = retryOnly && smartTestAllowed(isPremium);
      const flaggedAllowed = flaggedOnly && smartTestAllowed(isPremium);

      // How many questions the chosen sections actually hold. This is what
      // turns "all questions" into a number, and what stops a request for
      // 500 from meaning anything more than the bank. Used as-is for the
      // two history-built presets above, which draw by id and never filter
      // by topic in the first place — the plan's section gating has
      // nothing to narrow there.
      const available = await countTestQuestions(aircraftCode, topics);
      const size = resolveTestSize(length, available);

      // Only the question and its options cross to the browser. The correct
      // answer and the explanation stay on the server until the test is graded.
      if (retryAllowed) {
        // Retry mode needs an account, because it is built from that
        // account's history. Signed out there is nothing to retry, so fall
        // back to a normal random test rather than showing an error.
        const ids = user ? await getQuestionIdsToRetry(user.id, aircraftCode, size) : [];
        questions = ids.length > 0 ? await getTestQuestionsByIds(aircraftCode, ids) : [];
      } else if (flaggedAllowed) {
        // Same free-tier exemption as retry, and for the same reason: a
        // question can only be flagged after it was already shown once, so
        // revisiting it costs nothing further — see the note on
        // `FREE_QUESTIONS_PER_AIRCRAFT` in `access-policy.ts`.
        const ids = user ? (await getFlaggedQuestionIds(user.id, aircraftCode)).slice(0, size) : [];
        questions = ids.length > 0 ? await getTestQuestionsByIds(aircraftCode, ids) : [];
      } else {
        // A normal pick (including a smart-test preset a free account is
        // not allowed to use) is narrowed to the sections the plan actually
        // grants — see `resolveAllowedTopics` — before anything is counted
        // or fetched. `topics` itself is left alone: it is what a "Change
        // sections" link on this same test would rebuild the URL from, and
        // it still means what `parseTopics` always said it means.
        const allTopicNames = isPremium ? [] : (await listTopics(aircraftCode)).map((t) => t.topic);
        const allowedTopics = resolveAllowedTopics(topics, allTopicNames, aircraftCode, isPremium);
        const allowedAvailable =
          allowedTopics === topics ? available : await countTestQuestions(aircraftCode, allowedTopics);

        // A fresh pick is where a free account could otherwise be handed
        // every question in the bank at once and simply never answer any of
        // them — `answerQuestion`'s own paywall only stops grading, not the
        // page from being built in the first place. So the size itself is
        // capped here, before a single question is fetched: a signed-in
        // student without an active subscription can never have more than
        // the aircraft's free allowance *delivered* to the browser, not just
        // "more than the allowance gradeable". This applies to "unseen" too
        // — unlike retry and flagged, it draws questions the student has
        // never spent any allowance on, so it is exactly the case the free
        // tier exists to meter. `capQuestionCount` is the newer, coarser
        // plan cap from `config/plans.ts` (20 questions on the free plan,
        // whatever the aircraft); the two are independent and both apply.
        let allowedSize = capQuestionCount(resolveTestSize(length, allowedAvailable), isPremium);
        if (user) {
          const subscription = await getSubscription(user.id);
          if (!hasActiveSubscription(subscription)) {
            const [distinctAnswered, settings] = await Promise.all([
              countQuestionsAnswered(user.id, aircraftCode),
              getSiteSettings(),
            ]);
            allowedSize = Math.min(
              allowedSize,
              remainingFreeQuestions(distinctAnswered, settings.freeQuestionsPerAircraft),
            );
          }
        }
        freeLimitReached = allowedSize === 0 && allowedAvailable > 0;
        if (allowedSize === 0) {
          questions = [];
        } else if (unseenOnly && smartTestAllowed(isPremium) && user) {
          questions = await pickUnseenTestQuestions(aircraftCode, user.id, allowedSize, allowedTopics);
        } else {
          // Signed out, "unseen" has nothing to exclude against — a normal
          // random pick is the same graceful fallback retry and flagged use.
          questions = await pickTestQuestions(aircraftCode, allowedSize, allowedTopics);
        }
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
            freeLimitReached
              ? `You've used your free questions on ${plane.code}.`
              : retryOnly
                ? "Nothing to retry right now."
                : flaggedOnly
                  ? "You haven't flagged any questions yet."
                  : unseenOnly
                    ? `You've seen every published question on ${plane.code}.`
                    : sections
                      ? `There are no published questions in ${sections} yet.`
                      : "There are no published questions for this aircraft yet."
          }
        >
          {freeLimitReached ? (
            <>
              Subscribe for unlimited questions on every aircraft.{" "}
              <Link href="/upgrade" className="font-medium text-brand hover:underline">
                Upgrade
              </Link>
            </>
          ) : retryOnly ? (
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
          ) : flaggedOnly ? (
            <>
              Flag a question mid-test to come back to it later.{" "}
              <Link
                href={buildTestHref(plane.code)}
                className="font-medium text-brand hover:underline"
              >
                Take a normal test
              </Link>{" "}
              instead.
            </>
          ) : unseenOnly ? (
            <>
              That is every question on this type, at least once.{" "}
              <Link
                href={buildTestHref(plane.code)}
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

  // Flags are a convenience layered on top of sitting the test, not part of
  // it, so a failure here must not be the reason a student cannot start —
  // the runner simply shows every question as unflagged, exactly as it
  // would for a signed-out visitor.
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
      // Left empty — see the note above.
    }
  }

  // Never throws — see the note on `getSiteSettings` in `db/settings.ts` —
  // so it is safe to read this late, after everything that can fail.
  const settings = await getSiteSettings();

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
      // Derived here rather than asked for: exam mode gets a minute a
      // question, study mode gets no deadline at all. It is computed after
      // the questions are drawn because it depends on how many there are —
      // "all questions" is not a number until the bank has been counted.
      timeLimitSeconds={timeLimitFor(mode, questions.length)}
      initialStartedAt={initialStartedAt}
      initialExpiresAt={initialExpiresAt}
      isSignedIn={user !== null}
      initialFlaggedIds={initialFlaggedIds}
      passMarkPercent={settings.passMarkPercent}
    />
  );
}
