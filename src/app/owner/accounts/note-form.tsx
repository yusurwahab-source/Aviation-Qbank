"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateAccountNote, type NoteState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 min-h-11 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save note"}
    </button>
  );
}

/** The owner's own note on one account — never shown to the account itself. */
export function NoteForm({ userId, note }: { userId: string; note: string }) {
  const [state, formAction] = useActionState<NoteState, FormData>(updateAccountNote, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <label htmlFor="body" className="sr-only">
        Note about this account
      </label>
      <textarea
        id="body"
        name="body"
        rows={4}
        defaultValue={note}
        placeholder="e.g. Asked for a refund, granted a month as a goodwill gesture."
        maxLength={4000}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
      />
      <SubmitButton />
      {state.error ? (
        <p role="alert" className="mt-2 text-xs text-incorrect">
          {state.error}
        </p>
      ) : null}
      {state.message ? <p className="mt-2 text-xs text-correct">{state.message}</p> : null}
    </form>
  );
}
