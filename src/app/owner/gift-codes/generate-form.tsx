"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { generate, type GenerateState } from "./actions";
import { MAX_GENERATE_COUNT } from "./constants";

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

/** A CSV of exactly the codes just minted, built and downloaded entirely in
 * the browser — no round trip needed for a list this page already has. */
function downloadCodesAsCsv(codes: string[]): void {
  const csv = ["code", ...codes].join("\r\n") + "\r\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gift-codes-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function GenerateForm({ aircraftCodes }: { aircraftCodes: string[] }) {
  const [state, formAction] = useActionState<GenerateState, FormData>(generate, {});
  const [grants, setGrants] = useState<"subscription" | "logbook">("subscription");
  const isLogbook = grants === "logbook";

  return (
    <div>
      <form action={formAction} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="grants" className="block text-sm font-medium text-foreground">
            What the code grants
          </label>
          <select
            id="grants"
            name="grants"
            value={grants}
            onChange={(event) => setGrants(event.target.value as "subscription" | "logbook")}
            className={inputClass}
          >
            <option value="subscription">Full access for a number of days</option>
            <option value="logbook">One Logbook Scanner unlock (one logbook, up to 40 spreads)</option>
          </select>
        </div>

        <div>
          <label htmlFor="count" className="block text-sm font-medium text-foreground">
            How many codes
          </label>
          <input
            id="count"
            name="count"
            type="number"
            min={1}
            max={MAX_GENERATE_COUNT}
            defaultValue={1}
            required
            className={inputClass}
          />
        </div>

        {isLogbook ? (
          // A logbook code carries a plan only because the column is not
          // null; it is never read.
          <input type="hidden" name="plan" value="monthly" />
        ) : (
          <>
            <div>
              <label htmlFor="days" className="block text-sm font-medium text-foreground">
                Days of access each
              </label>
              <input id="days" name="days" type="number" min={1} defaultValue={30} required className={inputClass} />
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
          </>
        )}

        <div>
          <label htmlFor="maxRedemptions" className="block text-sm font-medium text-foreground">
            Max redemptions per code
          </label>
          <input
            id="maxRedemptions"
            name="maxRedemptions"
            type="number"
            min={1}
            defaultValue={1}
            required
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            1 means single-use, as before. Higher lets several people share one code.
          </p>
        </div>

        <div>
          <label htmlFor="expiresAt" className="block text-sm font-medium text-foreground">
            Expires (optional)
          </label>
          <input id="expiresAt" name="expiresAt" type="date" className={inputClass} />
          <p className="mt-1 text-xs text-muted-foreground">
            Leave blank for a code that never goes stale on its own.
          </p>
        </div>

        {isLogbook ? null : (
          <div>
            <label htmlFor="unlocksAircraftCode" className="block text-sm font-medium text-foreground">
              Aircraft (optional)
            </label>
            <select id="unlocksAircraftCode" name="unlocksAircraftCode" defaultValue="" className={inputClass}>
              <option value="">All aircraft</option>
              {aircraftCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Recorded for your own reference only — redeeming this code still grants full access to
              every aircraft, the same as one with no aircraft set.
            </p>
          </div>
        )}

        <div className="sm:col-span-2">
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
            works once per person, up to the max redemptions set:
          </p>
          <textarea
            readOnly
            rows={Math.min(state.codes.length, 10)}
            value={state.codes.join("\n")}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Click the box to select all, then copy. Send one code per person — they redeem it at{" "}
            <span className="font-mono">/redeem</span>.
          </p>
          <button
            type="button"
            onClick={() => downloadCodesAsCsv(state.codes ?? [])}
            className="mt-3 min-h-9 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-brand hover:text-brand-ink"
          >
            Download these as CSV
          </button>
        </div>
      ) : null}
    </div>
  );
}
