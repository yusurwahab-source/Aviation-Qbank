"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";

import { Badge, Card, DifficultyBadge } from "@/components/ui";
import type { TestQuestion } from "@/db/queries";

import { saveAnswer, submitTest, type SubmitTestOutput } from "./actions";
import { ResultScreen } from "./result-screen";

/**
 * Runs one practice test: one question on screen at a time, then a result
 * screen. Answers live in component state while the test is in progress.
 *
 * A signed-in user's answers are also saved to the server as each one is
 * given, not only at Finish — see `saveAnswer` in `actions.ts`. That call is
 * fire-and-forget: a dropped one costs nothing, because Finish re-sends every
 * answer and that write is authoritative. The point of saving early is what
 * survives a refresh or an abandoned test, not what Finish depends on.
 */
export function TestRunner({
  aircraftCode,
  aircraftName,
  questions,
  topics = [],
  /**
   * Identifies this attempt at the test. Comes from `?t=` in the URL now,
   * rather than being minted inside the browser — that is what makes the
   * test resumable across a refresh, since the same id names the same
   * session on the server. A fresh test, and a restarted one, get a new id
   * from a server redirect, not from anything this component does.
   */
  clientTestId,
  /** Answers already recorded for this session — set only when resuming. */
  initialAnswers = {},
  /** Whether there is anyone to save answers for. */
  canRecord,
}: {
  aircraftCode: string;
  aircraftName: string;
  questions: TestQuestion[];
  /** The sections the student chose. Empty means the whole bank. */
  topics?: string[];
  clientTestId: string;
  initialAnswers?: Record<string, string>;
  canRecord: boolean;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(() => {
    if (Object.keys(initialAnswers).length === 0) return 0;
    const firstUnanswered = questions.findIndex((q) => !(q.id in initialAnswers));
    // Everything was already answered — land on the last question, one click
    // from Finish, rather than back at the start of a test already done.
    return firstUnanswered === -1 ? questions.length - 1 : firstUnanswered;
  });
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [result, setResult] = useState<SubmitTestOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmitting] = useTransition();
  const [isRestarting, startRestarting] = useTransition();

  /**
   * What this test is drawn from, for the header. Naming every section would
   * outgrow the line as soon as a student picks several, so past one it says
   * how many.
   */
  const scope =
    topics.length === 0
      ? aircraftName
      : topics.length === 1
        ? topics[0]
        : `${topics.length} sections`;

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const progress = useMemo(
    () => Math.round(((index + 1) / questions.length) * 100),
    [index, questions.length],
  );

  const select = useCallback(
    (questionId: string, optionId: string) => {
      setAnswers((previous) => ({ ...previous, [questionId]: optionId }));

      if (canRecord) {
        // Fire-and-forget: `saveAnswer` never throws (it catches internally
        // and returns a status), so this only guards against the call itself
        // failing to reach the server at all — offline, for instance.
        saveAnswer({
          aircraftCode,
          clientTestId,
          questionIds: questions.map((q) => q.id),
          questionId,
          selectedOptionId: optionId,
        }).catch(() => {
          // Nothing to show for this — Finish re-sends every answer and is
          // the write that actually has to succeed.
        });
      }
    },
    [aircraftCode, canRecord, clientTestId, questions],
  );

  const finish = useCallback(() => {
    setError(null);
    startSubmitting(async () => {
      try {
        const graded = await submitTest({
          aircraftCode,
          clientTestId,
          answers: questions.map((question) => ({
            questionId: question.id,
            selectedOptionId: answers[question.id] ?? null,
          })),
        });
        setResult(graded);
        window.scrollTo({ top: 0 });
      } catch {
        setError("Your test could not be marked. Check your connection and try again.");
      }
    });
  }, [aircraftCode, answers, clientTestId, questions]);

  /**
   * Starts a fresh test without leaving the page.
   *
   * A link back to this same URL would not do it: the browser is already here,
   * so nothing would re-render and the user would stare at their old result.
   * `router.refresh()` re-runs the server component on the same URL — this
   * test's id is now finished, so the server redirects to the same page with
   * a freshly minted one, which draws a new random set of questions. The
   * local state is cleared to match.
   */
  const restart = useCallback(() => {
    setResult(null);
    setAnswers({});
    setIndex(0);
    setError(null);
    window.scrollTo({ top: 0 });
    startRestarting(() => {
      router.refresh();
    });
  }, [router]);

  if (result) {
    return (
      <ResultScreen
        aircraftCode={aircraftCode}
        aircraftName={aircraftName}
        result={result}
        saveStatus={result.saveStatus}
        onRestart={restart}
      />
    );
  }

  if (isRestarting) {
    return (
      <Card className="text-center">
        <p className="text-sm text-muted-foreground">Picking a new set of questions…</p>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            {aircraftCode} · {scope}
          </p>
          <p className="text-sm text-muted-foreground">
            Question {index + 1} of {questions.length}
          </p>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={questions.length}
          aria-label="Test progress"
        >
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{current.topic}</Badge>
          {current.subtopic ? <Badge>{current.subtopic}</Badge> : null}
          <DifficultyBadge difficulty={current.difficulty} />
        </div>

        <h1 className="mt-4 text-lg font-semibold leading-snug text-foreground sm:text-xl">
          {current.question}
        </h1>

        <fieldset className="mt-5">
          <legend className="sr-only">Choose one answer</legend>
          <div className="space-y-2.5">
            {current.options.map((option) => {
              const checked = answers[current.id] === option.id;
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${
                    checked
                      ? "border-brand bg-brand-soft"
                      : "border-border bg-surface hover:border-brand"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${current.id}`}
                    value={option.id}
                    checked={checked}
                    onChange={() => select(current.id, option.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
                  />
                  <span className="flex gap-2 text-sm text-foreground">
                    <span className="font-mono font-semibold uppercase text-muted-foreground">
                      {option.id}
                    </span>
                    <span>{option.text}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </Card>

      {error ? (
        <p className="mt-4 rounded-lg bg-incorrect-soft px-4 py-3 text-sm text-incorrect" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0 || isSubmitting}
          className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <p className="order-last w-full text-center text-xs text-muted-foreground sm:order-none sm:w-auto">
          {answeredCount} of {questions.length} answered
        </p>

        {isLast ? (
          <button
            type="button"
            onClick={finish}
            disabled={isSubmitting}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Marking…" : "Finish test"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}
            disabled={isSubmitting}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        )}
      </div>

      <p className="mt-6 text-center">
        <Link
          href={`/aircraft/${aircraftCode}`}
          className="text-sm text-muted-foreground hover:text-brand hover:underline"
        >
          Abandon test
        </Link>
      </p>
    </div>
  );
}
