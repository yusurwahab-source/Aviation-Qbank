"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/credentials";

import type { AuthFormState } from "./actions";

/**
 * The shared shape of the sign-up and log-in screens. They differ only in
 * wording, the action they post to, and the password hint.
 */

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function AuthForm({
  action,
  title,
  subtitle,
  submitLabel,
  pendingLabel,
  passwordHint,
  passwordAutoComplete,
  passwordAside,
  footer,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  title: string;
  subtitle: string;
  submitLabel: string;
  pendingLabel: string;
  passwordHint?: string;
  /** Tells the browser's password manager whether to offer or to save. */
  passwordAutoComplete: "current-password" | "new-password";
  /** Optional link beside the password label — "Forgotten?" on log in. */
  passwordAside?: { label: string; href: string };
  footer: { text: string; linkLabel: string; href: string };
}) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(action, {});

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

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

          <div>
            {/* Beside the label, where somebody who cannot remember their
                password is already looking. */}
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              {passwordAside ? (
                <Link
                  href={passwordAside.href}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  {passwordAside.label}
                </Link>
              ) : null}
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={passwordAutoComplete}
              aria-invalid={state.fieldErrors?.password ? true : undefined}
              aria-describedby={
                state.fieldErrors?.password
                  ? "password-error"
                  : passwordHint
                    ? "password-hint"
                    : undefined
              }
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-brand"
            />
            {state.fieldErrors?.password ? (
              <p id="password-error" className="mt-1.5 text-sm text-incorrect">
                {state.fieldErrors.password}
              </p>
            ) : passwordHint ? (
              <p id="password-hint" className="mt-1.5 text-xs text-muted-foreground">
                {passwordHint}
              </p>
            ) : null}
          </div>

          <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
        </form>
      </Card>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {footer.text}{" "}
        <Link href={footer.href} className="font-medium text-brand hover:underline">
          {footer.linkLabel}
        </Link>
      </p>
    </div>
  );
}

export const PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters. Length matters more than symbols.`;
