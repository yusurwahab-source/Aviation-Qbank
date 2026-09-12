"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";

import { Badge, Card, DifficultyBadge } from "@/components/ui";
import type { TestQuestion } from "@/db/queries";

import { submitTest, type SubmitTestOutput } from "./actions";
import { ResultScreen } from "./result-screen";

/**
 * Runs one practice test: one question on screen at a time, then a result
 * screen. Answers live in component state while the test is in progress and
 * are only sent to the server when the user finishes.
 */
export function TestRunner({
  aircraftCode,
  aircraftName,
  questions,
}: {
  aircraftCode: string;
  aircraftName: string;
  questions: TestQuestion[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitTestOutput | null>(null);
  /**
   * Identifies this attempt at the test, so that a double-click or a retried
   * request records it once rather than twice. Generated when the test starts
   * and reset by `restart`.
   */
  const [clientTestId, setClientTestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmitting] = useTransition();
  const [isRestarting, startRestarting] = useTransition();

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
    },
    [],
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
   * `router.refresh()` re-runs the server component, which draws a new random
   * set of questions, and the local state is cleared to match.
   */
  const restart = useCallback(() => {
    setResult(null);
    setAnswers({});
    setIndex(0);
    setError(null);
    // A new test is a new thing to record, so it needs its own key.
    setClientTestId(crypto.randomUUID());
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
            {aircraftCode} · {aircraftName}
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
