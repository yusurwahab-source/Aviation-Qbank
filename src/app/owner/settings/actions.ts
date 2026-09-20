"use server";

import { listAircraft } from "@/db/queries";
import { saveSiteSettings } from "@/db/settings";
import { validateSettings, type SiteSettings } from "@/lib/settings";
import { ownerAction } from "@/lib/owner/audited-action";

export type SettingsState = {
  error?: string;
  message?: string;
};

/**
 * Stores the free-question allowance, the announcement banner, the pass
 * mark, and the two marketing curation settings (featured aircraft,
 * aircraft marked "in development").
 *
 * `validateSettings` is the only way any of these values reach the
 * database — the same split as content validation and the checkout form:
 * untrusted input is parsed once, in one place, before anything is written.
 * It checks *shape* only (a real aircraft-code pattern); this action checks
 * the two aircraft-curation fields against the aircraft that actually exist,
 * because that check needs the database and `validateSettings` has to stay
 * pure to be unit tested the way the rest of `lib/settings.ts` is. Neither
 * check ever writes to the `aircraft` table — both only decide what
 * marketing surfaces say about rows that already exist there.
 */
export const updateSettings = ownerAction<SettingsState, SiteSettings>({
  action: "settings.update",
  targetType: "site_settings",

  parse(formData) {
    const validated = validateSettings({
      freeQuestionsPerAircraft: formData.get("freeQuestionsPerAircraft"),
      announcement: formData.get("announcement"),
      passMarkPercent: formData.get("passMarkPercent"),
      featuredAircraftCode: formData.get("featuredAircraftCode"),
      aircraftInDevelopment: formData.get("aircraftInDevelopment"),
    });

    if (!validated.ok) return { ok: false, state: { error: validated.error } };
    return { ok: true, input: validated.settings };
  },

  async run(settings) {
    const fleet = await listAircraft();
    const knownCodes = new Set(fleet.map((plane) => plane.code));

    if (!knownCodes.has(settings.featuredAircraftCode)) {
      return {
        ok: false,
        state: {
          error: `"${settings.featuredAircraftCode}" is not an aircraft in the bank.`,
        },
      };
    }

    const unknownInDevelopment = settings.aircraftInDevelopment.filter(
      (code) => !knownCodes.has(code),
    );
    if (unknownInDevelopment.length > 0) {
      return {
        ok: false,
        state: {
          error: `${unknownInDevelopment.join(", ")} ${unknownInDevelopment.length === 1 ? "is" : "are"} not aircraft in the bank.`,
        },
      };
    }

    await saveSiteSettings(settings);

    return {
      ok: true,
      state: { message: "Settings saved." },
      metadata: { ...settings },
    };
  },

  // Every page that reads a setting reads it on the request it is rendering,
  // so revalidating the whole site is what makes a change visible without a
  // deploy — the same reason `db:seed` publishing content needs no separate
  // step, just applied to a value instead of a file.
  revalidate: [{ path: "/", type: "layout" }],
});
