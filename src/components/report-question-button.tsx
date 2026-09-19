"use client";

import { useId, useState } from "react";

/**
 * "Report a problem with this question" — on every question, signed in or
 * not. Self-contained: unlike `FlagButton`, nothing else on screen needs to
 * agree on whether a question has been reported, so this owns its own
 * open/sent state rather than being handed one.
 */
export function ReportQuestionButton({
  onReport,
}: {
  onReport: (message: string) => Promise<{ status: "sent" | "failed" }>;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const fieldId = useId();

  if (status === "sent") {
    return <p className="text-sm font-medium text-muted-foreground">Thanks — we&rsquo;ll take a look.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-target inline-flex items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition hover:border-warning hover:text-warning"
      >
        <ReportIcon /> Report a problem
      </button>
    );
  }

  async function submit() {
    if (message.trim().length === 0) return;
    setStatus("sending");
    const result = await onReport(message.trim());
    setStatus(result.status === "sent" ? "sent" : "failed");
  }

  return (
    <div className="w-full max-w-md space-y-2 rounded-lg border border-border bg-surface p-3">
      <label htmlFor={fieldId} className="text-xs font-medium text-muted-foreground">
        What looks wrong with this question?
      </label>
      <textarea
        id={fieldId}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={3}
        placeholder="e.g. I think option B is actually correct, per the FCOM..."
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:border-brand focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={status === "sending" || message.trim().length === 0}
          className="tap-target inline-flex items-center rounded-lg bg-brand px-3.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="tap-target text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      {status === "failed" ? (
        <p className="text-xs text-incorrect" role="alert">
          Could not send that just now. Please try again.
        </p>
      ) : null}
    </div>
  );
}

function ReportIcon() {
  return (
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
      <path d="M12 9v4M12 16.5h.01" />
      <path d="M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z" />
    </svg>
  );
}
