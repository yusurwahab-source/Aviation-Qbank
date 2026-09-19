import "server-only";

import { cache } from "react";
import { sql } from "drizzle-orm";

import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import {
  DEFAULT_SETTINGS,
  parseSettings,
  settingsToRows,
  type SiteSettings,
} from "@/lib/settings";

/**
 * Reading and writing the owner's settings.
 *
 * Not in `owner.ts` even though only the owner writes them: these are read
 * by public pages on nearly every request, and that file is documented as
 * the one nothing outside `/owner` may import. The write below is the part
 * that is owner-only, and it is guarded where every other owner write is —
 * by `requireOwner()` in the action that calls it.
 */

/**
 * The current settings, or the defaults if anything at all goes wrong.
 *
 * Wrapped in `cache` so a page rendering the banner, the free allowance and
 * a paywall check asks once per request rather than three times.
 *
 * The `catch` is load-bearing rather than defensive habit: this is read
 * while answering a question and while building a test, and a settings read
 * is never what any of that is *for*. A database that cannot answer should
 * cost the student the behaviour this app shipped with, not the page — the
 * pages that genuinely depend on the database still catch their own failures
 * and render `DatabaseUnavailable`.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const rows = await getDb()
      .select({ key: siteSettings.key, value: siteSettings.value })
      .from(siteSettings);
    return parseSettings(rows);
  } catch {
    return DEFAULT_SETTINGS;
  }
});

/**
 * Stores a validated set of settings, one upsert per key.
 *
 * The caller has already validated — `validateSettings` is the only way in,
 * the same way `upsertSubscription` trusts a caller that has already
 * verified a webhook's signature.
 */
export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  const rows = settingsToRows(settings);

  await getDb()
    .insert(siteSettings)
    .values(rows)
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: sql`excluded.value`, updatedAt: sql`now()` },
    });
}
