"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { retryFailed, type RetryState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Working…" : "Queue the failed ones again"}
    </button>
  );
}

export function RetryButton({ broadcastId }: { broadcastId: string }) {
  const [state, formAction] = useActionState<RetryState, FormData>(retryFailed, {});

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="broadcastId" value={broadcastId} />
      <Submit />
      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-incorrect">
          {state.error}
        </p>
      ) : null}
      {state.message ? <p className="mt-2 text-sm text-correct">{state.message}</p> : null}
    </form>
  );
}
