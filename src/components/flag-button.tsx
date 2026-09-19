/**
 * Marks a question to come back to.
 *
 * Fully controlled: the caller owns whether this question is flagged (it
 * already has to, for the question map to colour every tile from one place)
 * and this button only ever asks for the opposite of what it is shown. That
 * is what makes the click optimistic without this component needing any
 * state of its own to get out of sync — the caller flips its state before
 * the server call resolves, and this button simply reflects whatever it is
 * handed.
 */
export function FlagButton({
  flagged,
  onToggle,
  className = "",
}: {
  flagged: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={flagged}
      onClick={onToggle}
      className={`tap-target inline-flex items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition ${
        flagged
          ? "border-flag bg-flag-soft text-flag"
          : "border-border text-muted-foreground hover:border-flag hover:text-flag"
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill={flagged ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 3v18M6 4h11l-2.5 3.5L17 11H6" />
      </svg>
      {flagged ? "Flagged" : "Flag"}
    </button>
  );
}
