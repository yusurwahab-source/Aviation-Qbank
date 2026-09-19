"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitAircraftInterest, type AircraftInterestState } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 shrink-0 rounded-lg bg-brand px-5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending…" : "Notify me"}
    </button>
  );
}

/** "Which aircraft next?" — a name and an email, saved for the owner to read. */
export function AircraftInterestForm() {
  const [state, formAction] = useActionState<AircraftInterestState, FormData>(
    submitAircraftInterest,
    {},
  );

  if (state.done) {
    return (
      <p className="text-sm font-medium text-foreground">
        Thanks — we&rsquo;ll let you know if we build it.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex-1">
        <label htmlFor="interest-aircraft" className="sr-only">
          Which aircraft?
        </label>
        <input
          id="interest-aircraft"
          name="aircraft"
          type="text"
          placeholder="Which aircraft? e.g. A320, CRJ, Citation"
          className="min-h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-subtle-foreground focus:border-brand focus:outline-none"
        />
        {state.fieldErrors?.aircraft ? (
          <p className="mt-1 text-xs text-incorrect">{state.fieldErrors.aircraft}</p>
        ) : null}
      </div>

      <div className="flex-1">
        <label htmlFor="interest-email" className="sr-only">
          Your email
        </label>
        <input
          id="interest-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          className="min-h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-subtle-foreground focus:border-brand focus:outline-none"
        />
        {state.fieldErrors?.email ? (
          <p className="mt-1 text-xs text-incorrect">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      <SubmitButton />

      {state.error ? (
        <p className="text-sm text-incorrect sm:basis-full" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
