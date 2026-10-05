"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { setMessagePreference, type MessagePreferenceState } from "./actions";

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap-target mt-3 inline-flex items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function MessagePreferenceForm({ receiving }: { receiving: boolean }) {
  const [state, formAction] = useActionState<MessagePreferenceState, FormData>(setMessagePreference, {});

  return (
    <form action={formAction}>
      <label className="flex items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          name="receive"
          defaultChecked={receiving}
          className="mt-1 h-4 w-4"
        />
        <span>
          Send me news and updates by email
          <span className="block text-xs text-muted-foreground">
            Emails your account needs — a password reset, a confirmation, a security notice — are
            always sent.
          </span>
        </span>
      </label>
      <Save />
      {state.saved ? (
        <p role="status" className="mt-2 text-xs text-correct">
          Saved.
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
