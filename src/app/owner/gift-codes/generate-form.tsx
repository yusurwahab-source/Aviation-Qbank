"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { generate, type GenerateState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 min-h-11 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Generating…" : "Generate"}
    </button>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none";

export function GenerateForm() {
  const [state, formAction] = useActionState<GenerateState, FormData>(generate, {});

  return (
    <div>
      <form action={formAction} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="count" className="block text-sm font-medium text-foreground">
            How many codes
          </label>
          <input
            id="count"
            name="count"
            type="number"
            min={1}
            max={100}
            defaultValue={1}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="days" className="block text-sm font-medium text-foreground">
            Days of access each
          </label>
          <input
            id="days"
            name="days"
            type="number"
            min={1}
            defaultValue={30}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="plan" className="block text-sm font-medium text-foreground">
            Plan
          </label>
          <select id="plan" name="plan" defaultValue="monthly" className={inputClass}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>

        <div>
          <label htmlFor="note" className="block text-sm font-medium text-foreground">
            Note (for you only, optional)
          </label>
          <input
            id="note"
            name="note"
            type="text"
            placeholder="e.g. beta testers"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <SubmitButton />
          {state.error ? (
            <p role="alert" className="mt-2 text-xs text-incorrect">
              {state.error}
            </p>
          ) : null}
        </div>
      </form>

      {state.codes ? (
        <div className="mt-6 rounded-lg border border-border bg-surface-muted p-4">
          <p className="mb-2 text-sm font-medium text-foreground">
            {state.codes.length === 1 ? "Your code" : `Your ${state.codes.length} codes`} — each
            works once:
          </p>
          <textarea
            readOnly
            rows={Math.min(state.codes.length, 10)}
            value={state.codes.join("\n")}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Click the box to select all, then copy. Send one code to each person — they redeem it
            at <span className="font-mono">/redeem</span>.
          </p>
        </div>
      ) : null}
    </div>
  );
}
