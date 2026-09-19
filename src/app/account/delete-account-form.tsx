"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { deleteAccount, type DeleteAccountState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="tap-target inline-flex items-center rounded-lg bg-incorrect px-4 text-sm font-semibold text-on-solid transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Permanently delete my account"}
    </button>
  );
}

/** Two steps, not one click: a checked box before the form even appears,
 * then the account's own password to actually submit it — the same
 * standard sign-in itself is held to, for the one action here that cannot
 * be undone by anyone, including the person who asked for it. */
export function DeleteAccountForm() {
  const [confirmed, setConfirmed] = useState(false);
  const [state, formAction] = useActionState<DeleteAccountState, FormData>(deleteAccount, {});

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--incorrect)]"
        />
        I understand this deletes my answer history, flags, notes and subscription record, and
        cannot be undone.
      </label>

      {confirmed ? (
        <form action={formAction} className="space-y-2.5">
          <div>
            <label htmlFor="delete-password" className="sr-only">
              Your password
            </label>
            <input
              id="delete-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Confirm your password"
              className="min-h-11 w-full max-w-xs rounded-lg border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-subtle-foreground focus:border-incorrect focus:outline-none"
            />
          </div>
          {state.error ? (
            <p className="text-sm text-incorrect" role="alert">
              {state.error}
            </p>
          ) : null}
          <SubmitButton />
        </form>
      ) : null}
    </div>
  );
}
