"use client";

import { useEffect, useRef, useState } from "react";

import { clampDragOffset, shouldDismissDrag } from "@/lib/bottom-sheet";
import type { AnswerVerdict } from "@/lib/practice-test-types";

import { CorrectIcon, IncorrectIcon } from "./runner";

/**
 * The FCOM explanation, on a phone: a bottom sheet that rises over the
 * question the moment an answer is revealed, rather than text pushed in
 * under the options the way the desktop layout still shows it
 * (`hidden lg:block` beside this component's own `lg:hidden`).
 *
 * It owns the forward action while it is open — there is no point showing
 * "Next question" on the sticky bar underneath a sheet sitting on top of
 * it — so dismissing is optional, not a precondition for moving on. A
 * student who wants the full card back (to flag it, add a note, or jump
 * elsewhere via the question map) drags the sheet down or taps the close
 * button; one who is happy to read and move on never has to touch it.
 *
 * Mounted with `key={current.id}` by the runner, so every question gets a
 * fresh instance: dismissing one question's sheet must never carry over as
 * "stay dismissed" on the next question's, and a freshly mounted instance
 * is what lets the slide-up actually animate (see the effect below) rather
 * than needing its own reset logic for a component that stuck around.
 */
export function ExplanationSheet({
  verdict,
  onNext,
  isLast,
  isSubmitting,
}: {
  verdict: AnswerVerdict | null;
  onNext: () => void;
  isLast: boolean;
  isSubmitting: boolean;
}) {
  // Starts off-screen and flips to "open" one frame after mounting, purely
  // so the browser has something to transition *from* — flipping straight
  // to the open transform on the very first render would just paint there,
  // with nothing to animate.
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [dragY, setDragY] = useState(0);
  // State, not a ref: the transition style below reads it during render, and
  // a ref's value must never be read there.
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);

  useEffect(() => {
    if (!verdict || dismissed) return;
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [verdict, dismissed]);

  if (!verdict) return null;

  function onHandlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    setIsDragging(true);
    dragStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onHandlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setDragY(clampDragOffset(event.clientY - dragStartY.current));
  }

  function onHandlePointerUp() {
    if (!isDragging) return;
    setIsDragging(false);
    if (shouldDismissDrag(dragY)) {
      setOpen(false);
      setDismissed(true);
    }
    setDragY(0);
  }

  const showing = open && !dismissed;

  return (
    <div
      role="status"
      aria-live="polite"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-border bg-surface-elevated px-4 pt-2 shadow-md lg:hidden"
      style={{
        transform: showing ? `translateY(${dragY}px)` : "translateY(100%)",
        transition: isDragging ? "none" : "transform 280ms ease-out",
      }}
    >
      <div className="flex items-center justify-between py-1.5">
        {/* The drag handle is the one draggable target, not the whole sheet
            or the close button beside it — a long explanation needs to
            scroll internally without every touch on it being read as a
            drag-to-dismiss, and the button needs its own click uncontested
            by a parent that calls `setPointerCapture` on every pointerdown
            under it. */}
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          className="flex flex-1 touch-none justify-center self-stretch"
          aria-hidden="true"
        >
          <span className="h-1.5 w-10 self-center rounded-full bg-border" />
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss explanation"
          className="tap-target -mr-2 inline-flex items-center justify-center rounded-lg text-muted-foreground transition hover:text-brand-ink"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
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

      <div className="max-h-[45vh] overflow-y-auto pb-1">
        <p
          className={`flex items-center gap-1.5 text-sm font-semibold ${
            verdict.isCorrect ? "text-correct" : "text-incorrect"
          }`}
        >
          {verdict.isCorrect ? <CorrectIcon /> : <IncorrectIcon />}
          {verdict.isCorrect ? "Correct" : "Not quite"}
        </p>
        <p className="mt-2 font-reading text-base text-foreground">{verdict.explanation}</p>
        {verdict.reference ? (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            Reference
            <span className="rounded border border-border bg-surface-muted px-2 py-0.5 font-mono text-foreground">
              {verdict.reference}
            </span>
          </p>
        ) : null}
      </div>

      <div className="pb-3 pt-3">
        <button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          className="tap-target w-full rounded-lg bg-brand text-sm font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLast ? (isSubmitting ? "Marking…" : "Finish test") : "Next question →"}
        </button>
      </div>
    </div>
  );
}
