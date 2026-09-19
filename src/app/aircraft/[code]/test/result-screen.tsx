"use client";

import Link from "next/link";

import { FlagButton } from "@/components/flag-button";
import { QuestionNote } from "@/components/question-note";
import { Badge, Card, ScoreBar } from "@/components/ui";
import type { GradedQuestion, TestResult } from "@/lib/grading";
import { buildTestHref, formatClock } from "@/lib/test-options";

import { loadNote, saveNote, type SaveStatus } from "./actions";

/**
 * The end-of-test screen: the score against a pass mark, how long it took,
 * how each topic went, and a full review of every question with the
 * explanation — for both study and exam alike, since exam mode has been
 * withholding all of this until exactly now.
 */
export function ResultScreen({
  aircraftCode,
  aircraftName,
  result,
  saveStatus,
  onRestart,
  isSignedIn,
  passMarkPercent,
  timeTakenSeconds,
  timeLimitSeconds,
  flaggedIds,
  onToggleFlag,
  communityPercentCorrect,
}: {
  aircraftCode: string;
  aircraftName: string;
  result: TestResult;
  /** Whether this result reached the user's history. */
  saveStatus: SaveStatus;
  /** Starts a fresh test in place; see `TestRunner.restart`. */
  onRestart: () => void;
  isSignedIn: boolean;
  /** The percentage a result needs to reach to show as a pass. */
  passMarkPercent: number;
  timeTakenSeconds: number;
  /** Null for a study-mode test, which never had a limit to compare against. */
  timeLimitSeconds: number | null;
  /** Which questions in this test are flagged — the same set the runner was
   * tracking, carried through rather than re-fetched. */
  flaggedIds: ReadonlySet<string>;
  onToggleFlag: (questionId: string) => void;
  /** "N% of pilots get this right", keyed by question id — see
   * `SubmitTestOutput.communityPercentCorrect`. A question with no entry
   * has no cached stat to show. */
  communityPercentCorrect: Record<string, number>;
}) {
  const passed = result.percentage >= passMarkPercent;
  // Weakest first is already how `byTopic` is sorted — the callout just
  // takes the first two rather than re-deriving anything.
  const weakestTopics = result.byTopic.slice(0, 2);

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
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-5xl font-semibold tracking-tight text-foreground">
                {result.percentage}%
              </p>
              {/* Never colour alone: the word carries the verdict, the
                  colour and the icon only reinforce it. */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                  passed ? "bg-correct-soft text-correct" : "bg-incorrect-soft text-incorrect"
                }`}
              >
                <VerdictIcon passed={passed} />
                {passed ? "Pass" : "Not a pass"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.correct} of {result.total} correct
              {result.unanswered > 0 ? ` · ${result.unanswered} left unanswered` : ""} · pass mark{" "}
              {passMarkPercent}%
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

        <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
          Time taken:{" "}
          <span className="font-mono font-medium text-foreground">
            {formatClock(timeTakenSeconds)}
          </span>
          {timeLimitSeconds !== null ? (
            <>
              {" "}
              of{" "}
              <span className="font-mono font-medium text-foreground">
                {formatClock(timeLimitSeconds)}
              </span>{" "}
              allowed
            </>
          ) : (
            " · untimed"
          )}
        </p>
      </Card>

      <SaveNotice status={saveStatus} />

      {weakestTopics.length > 0 ? (
        <section className="mt-6 rounded-lg border border-border bg-warning-soft p-4">
          <h2 className="text-sm font-semibold text-foreground">
            {weakestTopics.length === 1 ? "Your weakest system" : "Your weakest systems"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {weakestTopics
              .map((topic) => `${topic.topic} (${topic.percentage}%)`)
              .join(" and ")}
            {weakestTopics.length === 1 ? " is" : " are"} where the next study session should go.
          </p>
        </section>
      ) : null}

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
              <ReviewCard
                entry={entry}
                position={position + 1}
                aircraftCode={aircraftCode}
                isSignedIn={isSignedIn}
                flagged={flaggedIds.has(entry.question.id)}
                onToggleFlag={() => onToggleFlag(entry.question.id)}
                communityPercentCorrect={communityPercentCorrect[entry.question.id] ?? null}
              />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={buildTestHref(aircraftCode, { retryOnly: true })}
          className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
        >
          Retake the questions I got wrong
        </Link>
        {weakestTopics.length > 0 ? (
          <Link
            href={buildTestHref(aircraftCode, { topics: [weakestTopics[0].topic] })}
            className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
          >
            New test on my weakest system
          </Link>
        ) : null}
        <Link
          // A signed-in student's dashboard is the real /dashboard now; a
          // signed-out visitor has no account for one to belong to, so this
          // stays the public aircraft page rather than bouncing them to a
          // login wall they were never asked to go through.
          href={isSignedIn ? "/dashboard" : `/aircraft/${aircraftCode}`}
          className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
        >
          Back to dashboard
        </Link>
      </div>

      {/* Kept as a smaller, secondary action: the three above are what the
          brief asks the screen to offer, but "the same test again" is still
          worth one click rather than none. */}
      <p className="mt-3">
        <button
          type="button"
          onClick={onRestart}
          className="link-standalone text-sm font-medium text-brand hover:underline"
        >
          Or take another test like this one
        </button>
      </p>
    </div>
  );
}

function VerdictIcon({ passed }: { passed: boolean }) {
  return passed ? (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8" />
      <path d="m6.5 10 2.5 2.5 4.5-5" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8" />
      <path d="M7.5 7.5 12.5 12.5M12.5 7.5 7.5 12.5" />
    </svg>
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
      <div className="mt-3 rounded-lg border border-border bg-brand-soft p-4">
        <p className="text-sm font-medium text-foreground">This result was not saved.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a free account to keep a record of every test, see your progress by topic, and
          flag or make notes on the questions worth revisiting.
        </p>
        <div className="mt-3 flex gap-2">
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
          >
            Create a free account
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <p role="alert" className="mt-3 rounded-lg bg-incorrect-soft px-4 py-3 text-sm text-incorrect">
      Your answers could not be saved to your history. The score above is still
      correct, but this test will not appear in your progress.
    </p>
  );
}

function ReviewCard({
  entry,
  position,
  aircraftCode,
  isSignedIn,
  flagged,
  onToggleFlag,
  communityPercentCorrect,
}: {
  entry: GradedQuestion;
  position: number;
  aircraftCode: string;
  isSignedIn: boolean;
  flagged: boolean;
  onToggleFlag: () => void;
  communityPercentCorrect: number | null;
}) {
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

      {question.media ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.media}
          alt="Diagram for this question"
          className="mt-3 max-h-56 w-full rounded-lg border border-border object-contain"
        />
      ) : null}

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
        {communityPercentCorrect !== null ? (
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            {communityPercentCorrect}% of pilots get this right
          </p>
        ) : null}
        {question.reference ? (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            Reference
            <span className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-foreground">
              {question.reference}
            </span>
          </p>
        ) : null}
      </div>

      {isSignedIn ? (
        <div className="mt-3 flex flex-wrap items-start gap-2">
          <FlagButton flagged={flagged} onToggle={onToggleFlag} />
          <QuestionNote
            hasNote={false}
            onLoad={() => loadNote(question.id)}
            onSave={(body) => saveNote({ questionId: question.id, aircraftCode, body })}
          />
        </div>
      ) : null}
    </Card>
  );
}
