"use client";

import { useState } from "react";

/**
 * A question's id, shown small and muted so it never competes with the
 * question itself, but is there for a student to hand to whoever maintains
 * the content — "B737-SYSTEMS-0042 has the wrong answer marked". Click
 * copies it; `navigator.clipboard` throws in a locked-down browser, so the
 * copy is best-effort and the id stays readable and selectable either way.
 */
export function QuestionIdTag({ id, className = "" }: { id: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(id);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard unavailable — the id is still on screen to copy by hand.
        }
      }}
      title="Click to copy this question's id"
      className={`font-mono text-xs text-subtle-foreground transition hover:text-brand ${className}`}
    >
      {copied ? "Copied!" : id}
    </button>
  );
}
