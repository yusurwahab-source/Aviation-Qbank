"use client";

/** What `?` shows. A short, static list — there is nothing here worth
 * making dynamic, since the shortcuts themselves never change per test. */
const SHORTCUTS: [string, string][] = [
  ["1–9 / A–Z", "Choose an option"],
  ["Enter", "Next question, or Finish on the last one"],
  ["← →", "Previous / next question"],
  ["F", "Flag this question"],
  ["N", "Open this question's note"],
  ["?", "Show or hide this list"],
];

export function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="relative w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-5 shadow-md"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Keyboard shortcuts</h2>
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

        <dl className="mt-3 space-y-2">
          {SHORTCUTS.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="rounded border border-border bg-surface-muted px-2 py-0.5 font-mono text-xs text-foreground">
                {key}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
