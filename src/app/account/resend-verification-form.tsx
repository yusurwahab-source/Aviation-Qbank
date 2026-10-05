"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { resendVerification, type ResendVerificationState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="tap-target inline-flex items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send verification email"}
    </button>
  );
}

export function ResendVerificationForm() {
  const [state, formAction] = useActionState<ResendVerificationState, FormData>(
    resendVerification,
    {},
  );

  return (
    <form action={formAction} className="mt-3">
      <SubmitButton />
      {state.sent ? (
        <p role="status" className="mt-2 text-xs text-correct">
          Sent. Check your inbox — the link lasts a day.
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="mt-2 text-xs text-incorrect">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
