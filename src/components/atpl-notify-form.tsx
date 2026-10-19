"use client";

import { useActionState } from "react";

import { submitAircraftInterest, type AircraftInterestState } from "@/app/actions";

/**
 * "Notify me" for the ATPL subjects that have no bank yet. It reuses the
 * landing page's interest action and `aircraft_interest` table (read at
 * /owner/interest), naming the subject in the free-text field.
 */
export function AtplNotifyForm({ subjects }: { subjects: string[] }) {
  const [state, action, pending] = useActionState<AircraftInterestState, FormData>(
    submitAircraftInterest,
    {},
  );

  if (state.done) {
    return (
      <p role="status" className="text-sm text-foreground">
        Thanks — we will email you when the next subject goes live.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <input type="hidden" name="aircraft" value={`ATPL: ${subjects.join(", ")}`.slice(0, 120)} />
      <div className="flex-1">
        <label htmlFor="atpl-notify-email" className="sr-only">
          Email address
        </label>
        <input
          id="atpl-notify-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="tap-target w-full rounded-lg border border-border bg-surface px-3 text-base text-foreground"
        />
        {state.fieldErrors?.email ? (
          <p className="mt-1 text-sm text-danger">{state.fieldErrors.email}</p>
        ) : null}
        {state.error ? <p className="mt-1 text-sm text-danger">{state.error}</p> : null}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="tap-target rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Notify me"}
      </button>
    </form>
  );
}
