"use client";

import { useState } from "react";

/**
 * "Report a problem" on the question currently on screen.
 *
 * Rendered whether or not the student is signed in — unlike `FlagButton`,
 * which is a personal study aid and needs an account to belong to, a report
 * is about the question itself, and anyone practising can run into a wrong
 * answer or a typo. `onSubmit` is a prop rather than a direct import of the
 * server action so this component makes no assumption about which page it
 * is rendered from.
 */

const REASONS: { value: string; label: string }[] = [
  { value: "wrong_answer", label: "The marked answer is wrong" },
  { value: "unclear", label: "The question is unclear" },
  { value: "typo", label: "Typo" },
  { value: "outdated", label: "Outdated information" },
  { value: "other", label: "Something else" },
];

const MAX_COMMENT_LENGTH = 1000;

export function ReportQuestionButton({
  onSubmit,
  className = "",
}: {
  onSubmit: (input: { reason: string; comment: string }) => Promise<unknown>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]!.value);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  if (status === "sent") {
    return (
      <p className={`text-xs text-muted-foreground ${className}`} role="status">
        Thanks — reported.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`tap-target inline-flex items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition hover:border-warning hover:text-warning ${className}`}
      >
        Report a problem
      </button>
    );
  }

  return (
    <div className={`w-full rounded-lg border border-border bg-surface-muted p-3 sm:max-w-sm ${className}`}>
      <label htmlFor="report-reason" className="block text-xs font-medium text-foreground">
        What&rsquo;s wrong with this question?
      </label>
      <select
        id="report-reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="mt-1.5 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none"
      >
        {REASONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value.slice(0, MAX_COMMENT_LENGTH))}
        placeholder="Details, if you have any (optional)"
        rows={2}
        maxLength={MAX_COMMENT_LENGTH}
        className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={status === "sending"}
          onClick={async () => {
            setStatus("sending");
            try {
              await onSubmit({ reason, comment: comment.trim() });
              setStatus("sent");
            } catch {
              setStatus("failed");
            }
          }}
          className="min-h-9 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      {status === "failed" ? (
        <p role="alert" className="mt-2 text-xs text-incorrect">
          That could not be sent. Try again.
        </p>
      ) : null}
    </div>
  );
}
