"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui";

import { requestPasswordReset, type ResetRequestState } from "../actions";

/**
 * Asking for a reset link.
 *
 * Not built on `AuthForm`, which pairs an email with a password; this screen
 * has one field and, more to the point, a second state — the confirmation
 * that replaces it. That confirmation is the reason this is its own
 * component.
 */

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 w-full rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending…" : "Email me a link"}
    </button>
  );
}

export function ForgotForm({ emailConfigured }: { emailConfigured: boolean }) {
  const [state, formAction] = useActionState<ResetRequestState, FormData>(
    requestPasswordReset,
    {},
  );

  if (state.done) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Check your email</h1>
        {/*
          Carefully worded. "If there is an account" is not evasion for its own
          sake — saying "sent" outright would confirm that this address is
          registered to anybody who typed it in, which is exactly what the log
          in screen refuses to do.
        */}
        <p className="mt-3 text-sm text-muted-foreground">
          If there is an account for <span className="font-medium text-foreground">{state.email}</span>,
          a link to set a new password is on its way. It works once, and stops working after an hour.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing arrived? Check the spam folder, then ask again — the newest link is
          the only one that works.
        </p>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-brand-ink hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Forgotten your password?
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Give us the address you signed up with and we will email you a link to set a new one.
      </p>

      {/*
        Shown only to whoever is running the site without a mail provider —
        which is the default for a fresh clone. Better than a form that
        silently appears to work.
      */}
      {!emailConfigured ? (
        <p className="mt-4 rounded-lg bg-surface-muted px-4 py-3 text-sm text-muted-foreground">
          No email provider is configured, so the link will be printed in the server log
          instead of sent. See the README.
        </p>
      ) : null}

      <Card className="mt-6">
        <form action={formAction} className="space-y-4" noValidate>
          {state.error ? (
            <p
              role="alert"
              className="rounded-lg bg-incorrect-soft px-4 py-3 text-sm text-incorrect"
            >
              {state.error}
            </p>
          ) : null}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={state.email}
              aria-invalid={state.fieldErrors?.email ? true : undefined}
              aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-brand"
            />
            {state.fieldErrors?.email ? (
              <p id="email-error" className="mt-1.5 text-sm text-incorrect">
                {state.fieldErrors.email}
              </p>
            ) : null}
          </div>

          <SubmitButton />
        </form>
      </Card>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-brand-ink hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
