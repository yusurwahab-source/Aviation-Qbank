"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateAccess, type AccessState } from "./actions";

/**
 * The grant/revoke controls on one row of the accounts list.
 *
 * One form with two submit buttons rather than two forms: the days and the
 * plan belong to the grant, and a revoke simply ignores them. `useFormStatus`
 * has to read from inside the form, which is why the buttons are their own
 * component.
 */

function Buttons({ hasSubscription }: { hasSubscription: boolean }) {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="submit"
        name="intent"
        value="grant"
        disabled={pending}
        className="min-h-11 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Working…" : "Grant"}
      </button>

      {hasSubscription ? (
        <button
          type="submit"
          name="intent"
          value="revoke"
          disabled={pending}
          className="min-h-11 rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition hover:border-incorrect hover:text-incorrect disabled:cursor-not-allowed disabled:opacity-60"
        >
          Revoke
        </button>
      ) : null}
    </div>
  );
}

const fieldClass =
  "w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs text-foreground focus:border-brand focus:outline-none";

export function AccessForm({
  userId,
  email,
  hasSubscription,
}: {
  userId: string;
  email: string;
  hasSubscription: boolean;
}) {
  const [state, formAction] = useActionState<AccessState, FormData>(updateAccess, {});

  return (
    <form action={formAction} className="min-w-[13rem] space-y-2">
      <input type="hidden" name="userId" value={userId} />

      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`days-${userId}`}>
          Days of access for {email}
        </label>
        <input
          id={`days-${userId}`}
          name="days"
          type="number"
          min={1}
          max={3650}
          defaultValue={30}
          className={`${fieldClass} max-w-20`}
        />

        <label className="sr-only" htmlFor={`plan-${userId}`}>
          Plan for {email}
        </label>
        <select id={`plan-${userId}`} name="plan" defaultValue="monthly" className={fieldClass}>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </select>
      </div>

      <Buttons hasSubscription={hasSubscription} />

      {state.error ? (
        <p role="alert" className="text-xs text-incorrect">
          {state.error}
        </p>
      ) : null}
      {state.message ? <p className="text-xs text-correct">{state.message}</p> : null}
      {state.warning ? (
        <p role="alert" className="text-xs text-flag">
          {state.warning}
        </p>
      ) : null}
    </form>
  );
}
