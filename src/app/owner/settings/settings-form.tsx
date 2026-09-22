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
        <label
          htmlFor="previewQuestionsSignedOut"
          className="block text-sm font-medium text-foreground"
        >
          Preview questions when signed out
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          How many questions a visitor with no account may be shown the answer to, on each
          aircraft, before they have to sign up. Keep it small: this is the taste of the bank
          given away to anyone at all, not the free allowance a signed-in student gets. Zero
          means a visitor may read questions but is never shown an answer.
        </p>
        <input
          id="previewQuestionsSignedOut"
          name="previewQuestionsSignedOut"
          type="number"
          min={0}
          max={MAX_FREE_QUESTIONS}
          defaultValue={settings.previewQuestionsSignedOut}
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
        <label
          htmlFor="featuredAircraftCode"
          className="block text-sm font-medium text-foreground"
        >
          Featured aircraft
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          The type rating aircraft named in the landing page&rsquo;s structured data, for search
          engines. Must be a code already in the type rating bank — this never adds or changes
          an aircraft, only which one is named by example.
        </p>
        <input
          id="featuredAircraftCode"
          name="featuredAircraftCode"
          type="text"
          defaultValue={settings.featuredAircraftCode}
          placeholder="e.g. B737"
          required
          className={`${inputClass} max-w-40 font-mono uppercase`}
        />
      </div>

      <div>
        <label
          htmlFor="aircraftInDevelopment"
          className="block text-sm font-medium text-foreground"
        >
          Aircraft marked &ldquo;in development&rdquo;
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Shown on the type rating picker with an &ldquo;In development&rdquo; badge instead of
          a question count. One code per line or comma-separated. Leave blank for none.
        </p>
        <textarea
          id="aircraftInDevelopment"
          name="aircraftInDevelopment"
          rows={2}
          defaultValue={settings.aircraftInDevelopment.join(", ")}
          placeholder="e.g. A320"
          className={`${inputClass} max-w-sm font-mono uppercase`}
        />
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
