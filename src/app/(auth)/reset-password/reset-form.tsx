"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui";
import { PASSWORD_HINT } from "../auth-form";

import { resetPassword, type ResetPasswordState } from "../actions";

/**
 * Setting a new password from a link.
 *
 * Two password fields, not one. A typo in a *new* password is not a small
 * thing here: it would leave the account reachable only by asking for
 * another link, which is the very problem this screen exists to solve.
 */

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Set new password"}
    </button>
  );
}

export function ResetForm({ token, email }: { token: string; email: string }) {
  const [state, formAction] = useActionState<ResetPasswordState, FormData>(resetPassword, {});

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Set a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        For <span className="font-medium text-foreground">{email}</span>.
      </p>

      <Card className="mt-6">
        <form action={formAction} className="space-y-4" noValidate>
          {/*
            The link's token travels with the form rather than being read from
            the URL by the action. The action is a POST endpoint of its own —
            it has no URL to read.
          */}
          <input type="hidden" name="token" value={token} />

          {state.error ? (
            <p
              role="alert"
              className="rounded-lg bg-incorrect-soft px-4 py-3 text-sm text-incorrect"
            >
              {state.error}
            </p>
          ) : null}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={state.fieldErrors?.password ? true : undefined}
              aria-describedby={
                state.fieldErrors?.password ? "password-error" : "password-hint"
              }
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-brand"
            />
            {state.fieldErrors?.password ? (
              <p id="password-error" className="mt-1.5 text-sm text-incorrect">
                {state.fieldErrors.password}
              </p>
            ) : (
              <p id="password-hint" className="mt-1.5 text-xs text-muted-foreground">
                {PASSWORD_HINT}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-foreground">
              Confirm new password
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              aria-invalid={state.fieldErrors?.confirm ? true : undefined}
              aria-describedby={state.fieldErrors?.confirm ? "confirm-error" : undefined}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-brand"
            />
            {state.fieldErrors?.confirm ? (
              <p id="confirm-error" className="mt-1.5 text-sm text-incorrect">
                {state.fieldErrors.confirm}
              </p>
            ) : null}
          </div>

          <SubmitButton />
        </form>
      </Card>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Setting a new password signs you out everywhere else.{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Log in instead
        </Link>
      </p>
    </div>
  );
}
