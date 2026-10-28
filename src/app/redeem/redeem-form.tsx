"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { redeem, type RedeemState } from "./actions";
import { HeroButton } from "@/components/ui/hero-button";

/** Wired the same way `CheckoutForm` is: `useActionState` for the error a
 * failed redemption returns, `useFormStatus` for the pending state. */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <HeroButton type="submit" size="sm" fullWidth className="mt-4" loading={pending}>
      {pending ? "Redeeming…" : "Redeem"}
    </HeroButton>
  );
}

export function RedeemForm() {
  const [state, formAction] = useActionState<RedeemState, FormData>(redeem, {});

  return (
    <form action={formAction}>
      <label htmlFor="gift-code" className="block text-sm font-medium text-foreground">
        Gift code
      </label>
      <input
        id="gift-code"
        name="code"
        type="text"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="XXXX-XXXX-XXXX-XXXX"
        className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-sm tracking-wide text-foreground focus:border-brand focus:outline-none"
      />
      <SubmitButton />
      {state.error ? (
        <p role="alert" className="mt-2 text-xs text-incorrect">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
