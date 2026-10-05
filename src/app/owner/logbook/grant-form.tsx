"use client";

import { useActionState } from "react";

import { grantUnlocks, type GrantState } from "./actions";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none";

export function GrantUnlocksForm() {
  const [state, action, pending] = useActionState<GrantState, FormData>(grantUnlocks, {});

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[2fr_1fr]">
      <div>
        <label htmlFor="grant-email" className="block text-sm font-medium text-foreground">
          Account email
        </label>
        <input id="grant-email" name="email" type="email" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="grant-count" className="block text-sm font-medium text-foreground">
          Unlocks
        </label>
        <input id="grant-count" name="count" type="number" min={1} max={20} defaultValue={1} className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="grant-note" className="block text-sm font-medium text-foreground">
          Note (optional)
        </label>
        <input id="grant-note" name="note" maxLength={200} className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-on-solid hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? "Granting…" : "Grant"}
        </button>
        {state.error ? <p className="mt-2 text-xs text-incorrect">{state.error}</p> : null}
        {state.message ? <p className="mt-2 text-xs text-correct">{state.message}</p> : null}
      </div>
    </form>
  );
}
