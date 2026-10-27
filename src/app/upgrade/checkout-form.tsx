"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { CheckoutPlan } from "@/lib/billing/stripe";

import { startCheckout, type CheckoutState } from "./actions";
import { HeroButton } from "@/components/ui/hero-button";

/**
 * One plan's "Subscribe" button, wired the same way the sign-up and log-in
 * forms are: `useActionState` for the error a failed session-creation call
 * returns, `useFormStatus` for the pending state, so the button still works
 * without JavaScript and only gains the pending label with it.
 */
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <HeroButton type="submit" size="sm" fullWidth className="mt-4" loading={pending}>
      {pending ? "Redirecting…" : label}
    </HeroButton>
  );
}

export function CheckoutForm({ plan, label }: { plan: CheckoutPlan; label: string }) {
  const [state, formAction] = useActionState<CheckoutState, FormData>(startCheckout, {});

  return (
    <form action={formAction}>
      <input type="hidden" name="plan" value={plan} />
      <SubmitButton label={label} />
      {state.error ? (
        <p role="alert" className="mt-2 text-xs text-incorrect">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
