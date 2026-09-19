"use client";

import Link from "next/link";

import { Badge, Card, ScoreBar } from "@/components/ui";
import type { GradedQuestion, TestResult } from "@/lib/grading";

import type { SaveStatus } from "./actions";

/**
 * The end-of-test screen: the score, how each topic went, and a full review of
 * every question with the explanation.
 */
export function ResultScreen({
  aircraftCode,
  aircraftName,
  result,
  saveStatus,
  onRestart,
}: {
  aircraftCode: string;
  aircraftName: string;
  result: TestResult;
  /** Whether this result reached the user's history. */
  saveStatus: SaveStatus;
  /** Starts a fresh test in place; see `TestRunner.restart`. */
  onRestart: () => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-brand">
        {aircraftCode} · {aircraftName}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Test complete
      </h1>

      <Card className="mt-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-5xl font-semibold tracking-tight text-foreground">
              {result.percentage}%
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.correct} of {result.total} correct
              {result.unanswered > 0 ? ` · ${result.unanswered} left unanswered` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge tone="correct">{result.correct} right</Badge>
            <Badge tone="incorrect">{result.incorrect} wrong</Badge>
          </div>
        </div>
        <div className="mt-4">
          <ScoreBar percentage={result.percentage} tone="score" />
        </div>
      </Card>

      <SaveNotice status={saveStatus} />

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">How each topic went</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Weakest topic first — this is where the next study session should go.
        </p>
        <ul className="mt-3 space-y-3">
          {result.byTopic.map((topic) => (
            <li key={topic.topic} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{topic.topic}</span>
                <span className="text-sm text-muted-foreground">
                  {topic.correct}/{topic.total} · {topic.percentage}%
                </span>
              </div>
              <div className="mt-2">
                <ScoreBar percentage={topic.percentage} tone="score" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">Review every question</h2>
        <ul className="mt-3 space-y-4">
          {result.graded.map((entry, position) => (
            <li key={entry.question.id}>
              <ReviewCard entry={entry} position={position + 1} />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
        >
          Take another test
        </button>
        <Link
          href={`/aircraft/${aircraftCode}`}
          className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
        >
          Back to {aircraftCode}
        </Link>
        {saveStatus === "saved" || saveStatus === "already-saved" ? (
          <Link
            href={`/progress/${aircraftCode}`}
            className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
          >
            See your progress
          </Link>
        ) : null}
      </div>

    </div>
  );
}

/**
 * Says plainly what happened to this result.
 *
 * A result that failed to save must never look like one that saved: someone
 * studying towards a type rating will make decisions about what to revise based
 * on a history they believe is complete.
 */
function SaveNotice({ status }: { status: SaveStatus }) {
  if (status === "saved" || status === "already-saved") {
    return (
      <p className="mt-3 flex items-center gap-2 text-sm text-correct">
        <span aria-hidden="true">✓</span>
        Saved to your history.
      </p>
    );
  }

  if (status === "signed-out") {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        This result was not saved.{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Log in
        </Link>{" "}
        or{" "}
        <Link href="/signup" className="font-medium text-brand hover:underline">
          create an account
        </Link>{" "}
        to keep a record of your practice.
      </p>
    );
  }

  return (
    <p
      role="alert"
      className="mt-3 rounded-lg bg-incorrect-soft px-4 py-3 text-sm text-incorrect"
    >
      Your answers could not be saved to your history. The score above is still
      correct, but this test will not appear in your progress.
    </p>
  );
}

function ReviewCard({ entry, position }: { entry: GradedQuestion; position: number }) {
  const { question, isCorrect, wasAnswered, selectedOptionId } = entry;

  return (
    <Card className={isCorrect ? "border-l-4 border-l-correct" : "border-l-4 border-l-incorrect"}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Q{position}</span>
        <Badge tone="brand">{question.topic}</Badge>
        {isCorrect ? (
          <Badge tone="correct">Correct</Badge>
        ) : (
          <Badge tone="incorrect">{wasAnswered ? "Incorrect" : "Not answered"}</Badge>
        )}
        <span className="ml-auto font-mono text-xs text-muted-foreground">{question.id}</span>
      </div>

      <p className="question-text mt-3 font-medium text-foreground">{question.question}</p>

      <ul className="mt-3 space-y-1.5">
        {question.options.map((option) => {
          const isAnswer = option.id === question.correct;
          const isChosen = option.id === selectedOptionId;

          const tone = isAnswer
            ? "border-correct bg-correct-soft text-correct"
            : isChosen
              ? "border-incorrect bg-incorrect-soft text-incorrect"
              : "border-border text-muted-foreground";

          return (
            <li
              key={option.id}
              className={`flex flex-wrap items-start gap-x-2 gap-y-1 rounded-md border px-3 py-2 text-sm ${tone}`}
            >
              <span className="font-mono font-semibold uppercase">{option.id}</span>
              <span className="min-w-0 flex-1 basis-0">{option.text}</span>
              {isAnswer ? (
                <span className="basis-full text-xs font-semibold sm:basis-auto">
                  Correct answer
                </span>
              ) : null}
              {isChosen && !isAnswer ? (
                <span className="basis-full text-xs font-semibold sm:basis-auto">Your answer</span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 rounded-lg bg-surface-muted p-3">
        <p className="font-reading text-sm text-foreground">{question.explanation}</p>
        {question.reference ? (
          <p className="mt-2 text-xs text-muted-foreground">Reference: {question.reference}</p>
        ) : null}
      </div>
    </Card>
  );
}
