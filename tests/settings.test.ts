import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  MAX_ANNOUNCEMENT_LENGTH,
  MAX_FREE_QUESTIONS,
  parseSettings,
  settingsToRows,
  validateSettings,
} from "@/lib/settings";

describe("validateSettings", () => {
  it("accepts a well-formed submission", () => {
    const result = validateSettings({ freeQuestionsPerAircraft: "25", announcement: "Hello" });
    expect(result).toEqual({ ok: true, settings: { freeQuestionsPerAircraft: 25, announcement: "Hello" } });
  });

  it("trims the announcement", () => {
    const result = validateSettings({ freeQuestionsPerAircraft: "10", announcement: "  Hi  " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.announcement).toBe("Hi");
  });

  it("treats a missing announcement as empty, not an error", () => {
    const result = validateSettings({ freeQuestionsPerAircraft: "10", announcement: undefined });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.announcement).toBe("");
  });

  it("allows zero free questions — meaningful, not a mistake", () => {
    const result = validateSettings({ freeQuestionsPerAircraft: "0", announcement: "" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.freeQuestionsPerAircraft).toBe(0);
  });

  it.each([
    ["", "empty string"],
    ["-1", "negative"],
    ["1.5", "non-integer"],
    ["abc", "not a number"],
    [String(MAX_FREE_QUESTIONS + 1), "over the ceiling"],
  ])("rejects %s (%s)", (value) => {
    const result = validateSettings({ freeQuestionsPerAircraft: value, announcement: "" });
    expect(result.ok).toBe(false);
  });

  it("rejects a missing free-questions field rather than defaulting it", () => {
    const result = validateSettings({ freeQuestionsPerAircraft: undefined, announcement: "" });
    expect(result.ok).toBe(false);
  });

  it("rejects an announcement past the length limit", () => {
    const result = validateSettings({
      freeQuestionsPerAircraft: "10",
      announcement: "x".repeat(MAX_ANNOUNCEMENT_LENGTH + 1),
    });
    expect(result.ok).toBe(false);
  });

  it("accepts an announcement at exactly the length limit", () => {
    const result = validateSettings({
      freeQuestionsPerAircraft: "10",
      announcement: "x".repeat(MAX_ANNOUNCEMENT_LENGTH),
    });
    expect(result.ok).toBe(true);
  });
});

describe("parseSettings", () => {
  it("falls back to the defaults on an empty table", () => {
    expect(parseSettings([])).toEqual(DEFAULT_SETTINGS);
  });

  it("reads back stored values", () => {
    const rows = [
      { key: "free_questions_per_aircraft", value: "50" },
      { key: "announcement", value: "Back soon" },
    ];
    expect(parseSettings(rows)).toEqual({ freeQuestionsPerAircraft: 50, announcement: "Back soon" });
  });

  it("falls back on a corrupt number rather than throwing", () => {
    const rows = [{ key: "free_questions_per_aircraft", value: "not-a-number" }];
    expect(parseSettings(rows).freeQuestionsPerAircraft).toBe(
      DEFAULT_SETTINGS.freeQuestionsPerAircraft,
    );
  });

  it("falls back on a negative or out-of-range stored number", () => {
    expect(
      parseSettings([{ key: "free_questions_per_aircraft", value: "-5" }]).freeQuestionsPerAircraft,
    ).toBe(DEFAULT_SETTINGS.freeQuestionsPerAircraft);
    expect(
      parseSettings([{ key: "free_questions_per_aircraft", value: String(MAX_FREE_QUESTIONS + 1) }])
        .freeQuestionsPerAircraft,
    ).toBe(DEFAULT_SETTINGS.freeQuestionsPerAircraft);
  });

  it("ignores an unknown key rather than erroring", () => {
    expect(parseSettings([{ key: "something_else", value: "1" }])).toEqual(DEFAULT_SETTINGS);
  });
});

describe("settingsToRows", () => {
  it("round-trips through parseSettings", () => {
    const settings = { freeQuestionsPerAircraft: 42, announcement: "Round trip" };
    expect(parseSettings(settingsToRows(settings))).toEqual(settings);
  });
});
