"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { submitEarlyAccessSignup, type EarlyAccessState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="tap-target inline-flex w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <Spinner /> Sending…
        </>
      ) : (
        label
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

/**
 * The /pricing "buy" button, for every tier.
 *
 * Checkout is not live — see `src/config/plans.ts` — so this opens the
 * early-access form instead of starting a payment. Collapsed to a single
 * button until clicked: three open forms on first paint would outweigh
 * whatever three cards are trying to say plainly.
 */
export function EarlyAccessForm({ tier, tierName }: { tier: string; tierName: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<EarlyAccessState, FormData>(
    submitEarlyAccessSignup,
    {},
  );

  if (state.done) {
    return (
      <p className="rounded-lg border border-correct bg-correct-soft px-3 py-2.5 text-center text-sm font-medium text-correct">
        You&rsquo;re on the list — we&rsquo;ll email you the moment {tierName.toLowerCase()} checkout
        opens.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-target inline-flex w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
      >
        Join early access
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2.5">
      <input type="hidden" name="tier" value={tier} />

      <div>
        <label htmlFor={`ea-email-${tier}`} className="sr-only">
          Your email
        </label>
        <input
          id={`ea-email-${tier}`}
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="min-h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-subtle-foreground focus:border-brand focus:outline-none"
        />
        {state.fieldErrors?.email ? (
          <p className="mt-1 text-xs text-incorrect" role="alert">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={`ea-aircraft-${tier}`} className="sr-only">
          Which aircraft do you need?
        </label>
        <input
          id={`ea-aircraft-${tier}`}
          name="aircraft"
          type="text"
          required
          placeholder="Which aircraft? e.g. B737, DA40"
          className="min-h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-subtle-foreground focus:border-brand focus:outline-none"
        />
        {state.fieldErrors?.aircraft ? (
          <p className="mt-1 text-xs text-incorrect" role="alert">
            {state.fieldErrors.aircraft}
          </p>
        ) : null}
      </div>

      <SubmitButton label={`Notify me — ${tierName}`} />

      {state.error ? (
        <p className="text-xs text-incorrect" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
