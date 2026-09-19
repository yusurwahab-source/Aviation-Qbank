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
 * gives nothing away: the student was told at the time. In exam mode they say
 * only answered or not — see `questionStatus`, which cannot leak it because
 * the information is not there. Flagged is drawn independently of that: a
 * question can be flagged *and* correct, or flagged and still unanswered, so
 * it is a small marker layered on the tile rather than a colour of its own.
 *
 * On a phone this opens as a sheet anchored to the bottom of the viewport,
 * with a backdrop that closes it; from `lg` up it settles back into an
 * ordinary panel in the page flow. One component, no portal needed — unlike
 * the header's mobile menu, nothing between here and the viewport carries a
 * `backdrop-filter` or a `transform`, so `fixed` positioning here is safe
 * without one. See the note on that bug in `mobile-nav.tsx`.
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
  flagged,
  current,
  onJump,
  onClose,
}: {
  questions: TestQuestion[];
  answers: Record<string, string>;
  verdicts: Record<string, AnswerVerdict>;
  flagged: ReadonlySet<string>;
  /** Index of the question on screen, so it can be marked. */
  current: number;
  onJump: (index: number) => void;
  onClose: () => void;
}) {
  // Scanning a grid of a hundred tiles for the gaps is real work; this is the
  // shortcut. Null once nothing is left but the question already on screen.
  const nextGap = nextUnansweredIndex(
    questions.map((question) => question.id),
    answers,
    current,
  );

  return (
    <>
      {/* The backdrop only exists as a sheet, at mobile widths — from `lg` up
          the panel sits in the page flow and there is nothing behind it to
          dim or to close on. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
      />

      <div
        role="dialog"
        aria-label="All questions"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 mt-4 max-h-[75vh] overflow-y-auto rounded-t-xl border-t border-border bg-surface-elevated p-4 shadow-md lg:static lg:z-auto lg:max-h-none lg:overflow-visible lg:rounded-lg lg:border lg:bg-surface lg:shadow-none"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            All questions
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap-target -mr-2 inline-flex items-center justify-center rounded-lg text-muted-foreground transition hover:text-brand"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <ul className="mt-3 flex flex-wrap gap-2">
          {questions.map((question, index) => {
            const status = questionStatus(question.id, answers, verdicts);
            const isCurrent = index === current;
            const isFlagged = flagged.has(question.id);

            return (
              <li key={question.id} className="relative">
                <button
                  type="button"
                  onClick={() => onJump(index)}
                  aria-current={isCurrent ? "true" : undefined}
                  aria-label={`Question ${index + 1}, ${TILE_LABELS[status]}${isFlagged ? ", flagged" : ""}`}
                  className={`h-11 w-11 rounded-md border text-sm font-semibold tabular-nums transition ${
                    TILE_TONES[status]
                  } ${isCurrent ? "ring-2 ring-brand ring-offset-1 ring-offset-surface" : ""}`}
                >
                  {index + 1}
                </button>
                {isFlagged ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-flag ring-2 ring-surface-elevated lg:ring-surface"
                  />
                ) : null}
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

        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
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
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 w-3 rounded-full bg-flag" />
            Flagged
          </li>
        </ul>
      </div>
    </>
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
