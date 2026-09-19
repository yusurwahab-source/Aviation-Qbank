"use client";

import type { TestQuestion } from "@/db/queries";
import {
  nextUnansweredIndex,
  questionStatus,
  type QuestionStatus,
} from "@/lib/question-status";

import type { AnswerVerdict } from "./actions";

/**
 * A map of the test: every question, what state it is in, and a way to jump
 * straight to any of them.
 *
 * Collapsed by default and rendered only when opened. A test can be the whole
 * bank — a thousand buttons — and one question at a time is still the point of
 * the screen; the map is for when you want to go back to the two you skipped,
 * not something to study alongside the question.
 *
 * In study mode the tiles say whether each answered question was right, which
 * gives nothing away: the student was told at the time. In exam mode nothing
 * has been revealed and the tiles say only answered or not — see
 * `questionStatus`, which cannot leak it because the information is not there.
 */

const TILE_TONES: Record<QuestionStatus, string> = {
  unanswered: "border-border bg-surface text-muted-foreground hover:border-brand",
  answered: "border-brand bg-brand-soft text-brand",
  correct: "border-correct bg-correct-soft text-correct",
  incorrect: "border-incorrect bg-incorrect-soft text-incorrect",
};

/** Said out loud by a screen reader, so each tile explains itself. */
const TILE_LABELS: Record<QuestionStatus, string> = {
  unanswered: "not answered",
  answered: "answered",
  correct: "answered correctly",
  incorrect: "answered incorrectly",
};

export function QuestionNav({
  questions,
  answers,
  verdicts,
  current,
  onJump,
}: {
  questions: TestQuestion[];
  answers: Record<string, string>;
  verdicts: Record<string, AnswerVerdict>;
  /** Index of the question on screen, so it can be marked. */
  current: number;
  onJump: (index: number) => void;
}) {
  // Scanning a grid of a hundred tiles for the gaps is real work; this is the
  // shortcut. Null once nothing is left but the question already on screen.
  const nextGap = nextUnansweredIndex(
    questions.map((question) => question.id),
    answers,
    current,
  );

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        All questions
      </p>

      <ul className="mt-3 flex flex-wrap gap-2">
        {questions.map((question, index) => {
          const status = questionStatus(question.id, answers, verdicts);
          const isCurrent = index === current;

          return (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => onJump(index)}
                aria-current={isCurrent ? "true" : undefined}
                aria-label={`Question ${index + 1}, ${TILE_LABELS[status]}`}
                className={`h-11 w-11 rounded-md border text-sm font-semibold tabular-nums transition ${
                  TILE_TONES[status]
                } ${isCurrent ? "ring-2 ring-brand ring-offset-1 ring-offset-surface" : ""}`}
              >
                {index + 1}
              </button>
            </li>
          );
        })}
      </ul>

      {nextGap !== null ? (
        <button
          type="button"
          onClick={() => onJump(nextGap)}
          className="link-standalone mt-3 text-sm font-medium text-brand hover:underline"
        >
          Go to the next unanswered question →
        </button>
      ) : null}

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <Key tone={TILE_TONES.unanswered} label="Not answered" />
        {/* Which key to show is the same question as which tones can appear:
            study mode marks right and wrong, exam mode only answered. */}
        {Object.keys(verdicts).length > 0 ? (
          <>
            <Key tone={TILE_TONES.correct} label="Correct" />
            <Key tone={TILE_TONES.incorrect} label="Wrong" />
          </>
        ) : (
          <Key tone={TILE_TONES.answered} label="Answered" />
        )}
      </ul>
    </div>
  );
}

function Key({ tone, label }: { tone: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden="true" className={`h-3 w-3 rounded border ${tone}`} />
      {label}
    </li>
  );
}
