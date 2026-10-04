"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { PASSWORD_HINT } from "@/app/(auth)/auth-form";

import { changePassword, type ChangePasswordState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 w-full rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {pending ? "Saving…" : "Change password"}
    </button>
  );
}

function Field({
  id,
  label,
  autoComplete,
  error,
  hint,
}: {
  id: "current" | "password" | "confirm";
  label: string;
  autoComplete: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-brand"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-incorrect">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState<ChangePasswordState, FormData>(changePassword, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-lg bg-incorrect-soft px-4 py-3 text-sm text-incorrect">
          {state.error}
        </p>
      ) : null}
      {state.done ? (
        <p role="status" className="rounded-lg bg-correct-soft px-4 py-3 text-sm text-correct">
          Password changed. Every other device has been signed out, and we have emailed you a
          notice.
        </p>
      ) : null}

      <Field
        id="current"
        label="Current password"
        autoComplete="current-password"
        error={state.fieldErrors?.current}
      />
      <Field
        id="password"
        label="New password"
        autoComplete="new-password"
        error={state.fieldErrors?.password}
        hint={PASSWORD_HINT}
      />
      <Field
        id="confirm"
        label="Confirm new password"
        autoComplete="new-password"
        error={state.fieldErrors?.confirm}
      />

      <SubmitButton />
    </form>
  );
}
