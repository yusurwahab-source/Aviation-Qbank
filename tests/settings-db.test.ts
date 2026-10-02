import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/db";
import { getSiteSettings, saveSiteSettings } from "@/db/settings";
import { siteSettings } from "@/db/schema";
import { DEFAULT_SETTINGS, type SectionKey } from "@/lib/settings";

/**
 * Reading and writing settings against a real database.
 *
 * What matters here is the round trip through `onConflictDoUpdate` — that a
 * second save overwrites the first rather than erroring or duplicating a
 * row — which is exactly the part `settings.test.ts` cannot exercise since
 * it never touches a database.
 */

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

const base = {
  freeQuestionsPerAircraft: 5,
  previewQuestionsSignedOut: 3,
  announcement: "Testing",
  passMarkPercent: 80,
  featuredAircraftCode: "B737",
  aircraftInDevelopment: ["DA40"],
  hiddenSections: [] as SectionKey[],
};

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
    await saveSiteSettings(base);
    expect(await getSiteSettings()).toEqual(base);
  });

  it("overwrites rather than duplicating on a second save", async () => {
    await saveSiteSettings({ ...base, freeQuestionsPerAircraft: 5, announcement: "First", passMarkPercent: 70 });
    await saveSiteSettings({
      ...base,
      freeQuestionsPerAircraft: 15,
      announcement: "Second",
      passMarkPercent: 90,
      featuredAircraftCode: "DA40",
      aircraftInDevelopment: [],
    });

    const rows = await getDb().select().from(siteSettings);
    // Six keys, not twelve — the second save updated the existing rows.
    expect(rows).toHaveLength(6);
    expect(await getSiteSettings()).toEqual({
      ...base,
      freeQuestionsPerAircraft: 15,
      announcement: "Second",
      passMarkPercent: 90,
      featuredAircraftCode: "DA40",
      aircraftInDevelopment: [],
    });
  });

  it("clears the announcement back to empty", async () => {
    await saveSiteSettings({ ...base, announcement: "Visible" });
    await saveSiteSettings({ ...base, announcement: "" });

    const [row] = await getDb()
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "announcement"));
    expect(row?.value).toBe("");
  });

  it("saves and reads back the marketing curation fields", async () => {
    await saveSiteSettings({ ...base, featuredAircraftCode: "DA40", aircraftInDevelopment: ["B737"] });
    const settings = await getSiteSettings();
    expect(settings.featuredAircraftCode).toBe("DA40");
    expect(settings.aircraftInDevelopment).toEqual(["B737"]);
  });
});
