"use server";

import { revalidatePath } from "next/cache";

import { saveSiteSettings } from "@/db/settings";
import { validateSettings } from "@/lib/settings";
import { requireOwner } from "@/lib/auth/require-owner";

export type SettingsState = {
  error?: string;
  message?: string;
};

/**
 * Stores the free-question allowance and the announcement banner.
 *
 * `validateSettings` is the only way either value reaches the database — the
 * same split as content validation and the checkout form: untrusted input is
 * parsed once, in one place, before anything is written.
 */
export async function updateSettings(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await requireOwner();

  const validated = validateSettings({
    freeQuestionsPerAircraft: formData.get("freeQuestionsPerAircraft"),
    announcement: formData.get("announcement"),
  });

  if (!validated.ok) return { error: validated.error };

  await saveSiteSettings(validated.settings);

  // Every page that reads a setting reads it on the request it is rendering,
  // so revalidating the whole site is what makes a change visible without a
  // deploy — the same reason `db:seed` publishing content needs no separate
  // step, just applied to a value instead of a file.
  revalidatePath("/", "layout");

  return { message: "Settings saved." };
}
