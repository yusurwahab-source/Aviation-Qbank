import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/db";
import { getSiteSettings, saveSiteSettings } from "@/db/settings";
import { siteSettings } from "@/db/schema";
import { DEFAULT_SETTINGS } from "@/lib/settings";

/**
 * Reading and writing settings against a real database.
 *
 * What matters here is the round trip through `onConflictDoUpdate` — that a
 * second save overwrites the first rather than erroring or duplicating a
 * row — which is exactly the part `settings.test.ts` cannot exercise since
 * it never touches a database.
 */

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("site settings", () => {
  afterAll(async () => {
    // Leave the table as this suite found it, not as any one test left it —
    // other tests, and the running application, read defaults when the
    // table is empty.
    await getDb().delete(siteSettings);
  });

  it("falls back to defaults before anything is ever saved", async () => {
    await getDb().delete(siteSettings);
    expect(await getSiteSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("saves and reads back a change", async () => {
    await saveSiteSettings({ freeQuestionsPerAircraft: 5, announcement: "Testing" });
    expect(await getSiteSettings()).toEqual({ freeQuestionsPerAircraft: 5, announcement: "Testing" });
  });

  it("overwrites rather than duplicating on a second save", async () => {
    await saveSiteSettings({ freeQuestionsPerAircraft: 5, announcement: "First" });
    await saveSiteSettings({ freeQuestionsPerAircraft: 15, announcement: "Second" });

    const rows = await getDb().select().from(siteSettings);
    // Two keys, not four — the second save updated the existing rows.
    expect(rows).toHaveLength(2);
    expect(await getSiteSettings()).toEqual({ freeQuestionsPerAircraft: 15, announcement: "Second" });
  });

  it("clears the announcement back to empty", async () => {
    await saveSiteSettings({ freeQuestionsPerAircraft: 10, announcement: "Visible" });
    await saveSiteSettings({ freeQuestionsPerAircraft: 10, announcement: "" });

    const [row] = await getDb()
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "announcement"));
    expect(row?.value).toBe("");
  });
});
