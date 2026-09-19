"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  MAX_ANNOUNCEMENT_LENGTH,
  MAX_FREE_QUESTIONS,
  MAX_PASS_MARK_PERCENT,
  MIN_PASS_MARK_PERCENT,
  type SiteSettings,
} from "@/lib/settings";

import { updateSettings, type SettingsState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 min-h-11 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, formAction] = useActionState<SettingsState, FormData>(updateSettings, {});

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="freeQuestionsPerAircraft"
          className="block text-sm font-medium text-foreground"
        >
          Free questions per aircraft
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          How many questions a signed-in student may answer free, on each aircraft, before a
          subscription is required. Changing this does not affect questions already answered.
        </p>
        <input
          id="freeQuestionsPerAircraft"
          name="freeQuestionsPerAircraft"
          type="number"
          min={0}
          max={MAX_FREE_QUESTIONS}
          defaultValue={settings.freeQuestionsPerAircraft}
          required
          className={`${inputClass} max-w-40`}
        />
      </div>

      <div>
        <label htmlFor="announcement" className="block text-sm font-medium text-foreground">
          Announcement banner
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          One line shown above every page, to everyone. Leave blank to show nothing.
        </p>
        <input
          id="announcement"
          name="announcement"
          type="text"
          maxLength={MAX_ANNOUNCEMENT_LENGTH}
          defaultValue={settings.announcement}
          placeholder="e.g. Scheduled maintenance tonight, 22:00–23:00 UTC"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="passMarkPercent" className="block text-sm font-medium text-foreground">
          Pass mark
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          The percentage a result screen needs to reach to show as a pass. A label on the score
          only — it changes nothing about grading or access.
        </p>
        <div className="mt-1.5 flex max-w-40 items-center gap-2">
          <input
            id="passMarkPercent"
            name="passMarkPercent"
            type="number"
            min={MIN_PASS_MARK_PERCENT}
            max={MAX_PASS_MARK_PERCENT}
            defaultValue={settings.passMarkPercent}
            required
            className={inputClass}
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>

      <div>
        <SubmitButton />
        {state.error ? (
          <p role="alert" className="mt-2 text-xs text-incorrect">
            {state.error}
          </p>
        ) : null}
        {state.message ? <p className="mt-2 text-xs text-correct">{state.message}</p> : null}
      </div>
    </form>
  );
}
