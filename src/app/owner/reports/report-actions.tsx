"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { setReportStatus, type ReportActionState } from "./actions";

function Buttons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="submit"
        name="status"
        value="resolved"
        disabled={pending}
        className="min-h-9 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Working…" : "Mark resolved"}
      </button>
      <button
        type="submit"
        name="status"
        value="dismissed"
        disabled={pending}
        className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        Dismiss
      </button>
    </div>
  );
}

/** Marks one report resolved or dismissed. Not a destructive action — it
 * changes nothing about the question or anyone's access — so it needs no
 * confirm step, unlike revoking access or disabling a gift code. */
export function ReportActions({ reportId }: { reportId: string }) {
  const [state, formAction] = useActionState<ReportActionState, FormData>(setReportStatus, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="reportId" value={reportId} />
      <Buttons />
      {state.error ? (
        <p role="alert" className="mt-1 text-xs text-incorrect">
          {state.error}
        </p>
      ) : null}
      {state.message ? <p className="mt-1 text-xs text-correct">{state.message}</p> : null}
    </form>
  );
}
