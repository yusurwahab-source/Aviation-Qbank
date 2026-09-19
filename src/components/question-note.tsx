"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A student's own note on one question — opened on demand, not preloaded.
 *
 * Preloading every note for a test that might be the whole bank does not
 * scale, so the body arrives lazily the first time the editor is opened
 * (`onLoad`), and every change after that autosaves itself, debounced,
 * through `onSave`. There is nothing to submit and nothing to lose: closing
 * the editor does not discard a change that has not saved yet, because the
 * debounce has already fired well before a student would think to close it.
 */

const AUTOSAVE_DELAY_MS = 800;

export function QuestionNote({
  hasNote: initialHasNote,
  onLoad,
  onSave,
  className = "",
  textareaId,
  forceOpenToken,
}: {
  /** Whether a note already exists, for the button's own marker — the body
   * itself is not fetched until the editor is actually opened. */
  hasNote: boolean;
  onLoad: () => Promise<string>;
  onSave: (body: string) => Promise<unknown>;
  className?: string;
  /** Lets a keyboard shortcut (`N`) focus this exact editor. */
  textareaId?: string;
  /**
   * Bumped by a parent to force this editor open — the `N` shortcut's only
   * way in, since the open/closed state otherwise belongs entirely to this
   * component. A plain boolean would not do it: setting `open` true once
   * would not fire again for a second press once already open, and this
   * needs to fire every time regardless of the current state.
   */
  forceOpenToken?: number;
}) {
  const [open, setOpen] = useState(false);
  /**
   * Mirrors `forceOpenToken` so a *change* to it can be told apart from a
   * fresh instance simply inheriting whatever value it already reached —
   * seeded from the prop itself, so the two start equal and this only ever
   * fires open on a genuine, later change. Adjusted during render rather
   * than in an effect, which is what a fresh instance (this component is
   * remounted per question, via its `key`) needs: an effect would still
   * paint the previous question's open panel for one frame first.
   */
  const [openedForToken, setOpenedForToken] = useState(forceOpenToken ?? 0);
  if ((forceOpenToken ?? 0) !== openedForToken) {
    setOpenedForToken(forceOpenToken ?? 0);
    setOpen(true);
  }
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [hasNote, setHasNote] = useState(initialHasNote);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    onLoad().then((value) => {
      if (!cancelled) {
        setBody(value);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, loaded, onLoad]);

  useEffect(() => {
    // Disabled while loading, and a disabled element cannot take focus, so
    // this has to fire again once `loaded` flips, not only on `open` — and
    // `openedForToken` is in here too, because a second `N` press while
    // already open (having since lost focus, say to a click elsewhere)
    // changes it but leaves the `open` boolean itself at `true`, which on
    // its own would not re-trigger this effect.
    if (open && loaded) textareaRef.current?.focus();
  }, [open, loaded, openedForToken]);

  // Autosaves stay in flight after the component that mounted them is
  // gone — a student moving to the next question mid-debounce must not
  // lose the sentence they just typed.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function scheduleSave(next: string) {
    setBody(next);
    setStatus("saving");
    setHasNote(next.trim() !== "");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void onSave(next).then(() => setStatus("saved"));
    }, AUTOSAVE_DELAY_MS);
  }

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`tap-target inline-flex items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition ${
          hasNote
            ? "border-accent bg-accent-soft text-accent"
            : "border-border text-muted-foreground hover:border-accent hover:text-accent"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 4.5h13l3 3V19a.5.5 0 0 1-.5.5h-15A.5.5 0 0 1 4 19Z" />
          <path d="M8.5 10h7M8.5 13.5h5" />
        </svg>
        {hasNote ? "Note" : "Add note"}
      </button>

      {open ? (
        <div className="mt-2 rounded-lg border border-border bg-surface-muted p-3">
          <label htmlFor={textareaId} className="sr-only">
            Your note on this question
          </label>
          <textarea
            id={textareaId}
            ref={textareaRef}
            value={body}
            onChange={(event) => scheduleSave(event.target.value)}
            placeholder={loaded ? "Write anything worth remembering about this one…" : "Loading…"}
            disabled={!loaded}
            rows={3}
            className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
          />
          <p className="mt-1 text-right text-xs text-subtle-foreground" aria-live="polite">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
