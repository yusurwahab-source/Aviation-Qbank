import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  isItemHidden,
  sectionTitle,
  withItemOverride,
  MAX_ANNOUNCEMENT_LENGTH,
  MAX_FREE_QUESTIONS,
  MAX_PASS_MARK_PERCENT,
  MIN_PASS_MARK_PERCENT,
  parseSettings,
  settingsToRows,
  validateSettings,
} from "@/lib/settings";

const valid = {
  freeQuestionsPerAircraft: "10",
  previewQuestionsSignedOut: "5",
  announcement: "",
  passMarkPercent: "75",
  featuredAircraftCode: "B737",
  aircraftInDevelopment: "DA40",
};

describe("validateSettings", () => {
  it("accepts a well-formed submission", () => {
    const result = validateSettings({
      freeQuestionsPerAircraft: "25",
      previewQuestionsSignedOut: "3",
      announcement: "Hello",
      passMarkPercent: "80",
      featuredAircraftCode: "B737",
      aircraftInDevelopment: "DA40",
    });
    expect(result).toEqual({
      ok: true,
      settings: {
        freeQuestionsPerAircraft: 25,
        previewQuestionsSignedOut: 3,
        announcement: "Hello",
        passMarkPercent: 80,
        featuredAircraftCode: "B737",
        aircraftInDevelopment: ["DA40"],
        hiddenSections: [],
        hiddenItems: [],
        sectionLabels: {},
        itemOverrides: {},
      },
    });
  });

  it("accepts a preview allowance of zero — no answers given away at all", () => {
    const result = validateSettings({
      ...valid,
      previewQuestionsSignedOut: "0",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.previewQuestionsSignedOut).toBe(0);
  });

  it("refuses a negative preview allowance", () => {
    const result = validateSettings({
      ...valid,
      previewQuestionsSignedOut: "-1",
    });
    expect(result.ok).toBe(false);
  });

  it("refuses a preview allowance past the ceiling", () => {
    const result = validateSettings({
      ...valid,
      previewQuestionsSignedOut: String(MAX_FREE_QUESTIONS + 1),
    });
    expect(result.ok).toBe(false);
  });

  it("refuses a non-numeric preview allowance", () => {
    expect(
      validateSettings({ ...valid, previewQuestionsSignedOut: "five" }).ok,
    ).toBe(false);
    expect(
      validateSettings({ ...valid, previewQuestionsSignedOut: "" }).ok,
    ).toBe(false);
    expect(
      validateSettings({ ...valid, previewQuestionsSignedOut: undefined }).ok,
    ).toBe(false);
  });

  it("trims the announcement", () => {
    const result = validateSettings({ ...valid, announcement: "  Hi  " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.announcement).toBe("Hi");
  });

  it("treats a missing announcement as empty, not an error", () => {
    const result = validateSettings({ ...valid, announcement: undefined });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.announcement).toBe("");
  });

  it("allows zero free questions — meaningful, not a mistake", () => {
    const result = validateSettings({
      ...valid,
      freeQuestionsPerAircraft: "0",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.freeQuestionsPerAircraft).toBe(0);
  });

  it.each([
    ["", "empty string"],
    ["-1", "negative"],
    ["1.5", "non-integer"],
    ["abc", "not a number"],
    [String(MAX_FREE_QUESTIONS + 1), "over the ceiling"],
  ])("rejects %s free questions (%s)", (value) => {
    const result = validateSettings({
      ...valid,
      freeQuestionsPerAircraft: value,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a missing free-questions field rather than defaulting it", () => {
    const result = validateSettings({
      ...valid,
      freeQuestionsPerAircraft: undefined,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an announcement past the length limit", () => {
    const result = validateSettings({
      ...valid,
      announcement: "x".repeat(MAX_ANNOUNCEMENT_LENGTH + 1),
    });
    expect(result.ok).toBe(false);
  });

  it("accepts an announcement at exactly the length limit", () => {
    const result = validateSettings({
      ...valid,
      announcement: "x".repeat(MAX_ANNOUNCEMENT_LENGTH),
    });
    expect(result.ok).toBe(true);
  });

  it.each([
    ["", "empty string"],
    ["0", "below the floor — a pass mark of 0 fails nobody"],
    ["-1", "negative"],
    ["1.5", "non-integer"],
    [String(MAX_PASS_MARK_PERCENT + 1), "over the ceiling"],
    ["abc", "not a number"],
  ])("rejects pass mark %s (%s)", (value) => {
    const result = validateSettings({ ...valid, passMarkPercent: value });
    expect(result.ok).toBe(false);
  });

  it("accepts a pass mark at each bound", () => {
    expect(
      validateSettings({
        ...valid,
        passMarkPercent: String(MIN_PASS_MARK_PERCENT),
      }).ok,
    ).toBe(true);
    expect(
      validateSettings({
        ...valid,
        passMarkPercent: String(MAX_PASS_MARK_PERCENT),
      }).ok,
    ).toBe(true);
  });

  it("rejects a missing pass-mark field rather than defaulting it", () => {
    const result = validateSettings({ ...valid, passMarkPercent: undefined });
    expect(result.ok).toBe(false);
  });

  it("uppercases and trims the featured aircraft code", () => {
    const result = validateSettings({
      ...valid,
      featuredAircraftCode: " b737 ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.featuredAircraftCode).toBe("B737");
  });

  it.each([
    ["", "empty"],
    ["1", "starts with a digit"],
    ["toolongcode", "too long"],
    ["B-37", "has a separator"],
  ])("rejects a featured aircraft code that is %s (%s)", (value) => {
    const result = validateSettings({ ...valid, featuredAircraftCode: value });
    expect(result.ok).toBe(false);
  });

  it("parses aircraft-in-development as a comma- or newline-separated list", () => {
    const commaResult = validateSettings({
      ...valid,
      aircraftInDevelopment: "DA40, B737",
    });
    expect(commaResult.ok).toBe(true);
    if (commaResult.ok) {
      expect(commaResult.settings.aircraftInDevelopment).toEqual([
        "DA40",
        "B737",
      ]);
    }

    const newlineResult = validateSettings({
      ...valid,
      aircraftInDevelopment: "DA40\nB737",
    });
    expect(newlineResult.ok).toBe(true);
    if (newlineResult.ok) {
      expect(newlineResult.settings.aircraftInDevelopment).toEqual([
        "DA40",
        "B737",
      ]);
    }
  });

  it("deduplicates and uppercases aircraft-in-development codes", () => {
    const result = validateSettings({
      ...valid,
      aircraftInDevelopment: "da40, DA40, Da40",
    });
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.settings.aircraftInDevelopment).toEqual(["DA40"]);
  });

  it("treats a missing aircraft-in-development field as an empty list", () => {
    const result = validateSettings({
      ...valid,
      aircraftInDevelopment: undefined,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.settings.aircraftInDevelopment).toEqual([]);
  });

  it("rejects an invalid code inside the aircraft-in-development list", () => {
    const result = validateSettings({
      ...valid,
      aircraftInDevelopment: "DA40, not-a-code",
    });
    expect(result.ok).toBe(false);
  });
});

describe("parseSettings", () => {
  it("falls back to the defaults on an empty table", () => {
    expect(parseSettings([])).toEqual(DEFAULT_SETTINGS);
  });

  it("reads back stored values", () => {
    const rows = [
      { key: "free_questions_per_aircraft", value: "50" },
      { key: "preview_questions_signed_out", value: "2" },
      { key: "announcement", value: "Back soon" },
      { key: "pass_mark_percent", value: "70" },
      { key: "featured_aircraft_code", value: "DA40" },
      { key: "aircraft_in_development", value: "B737" },
    ];
    expect(parseSettings(rows)).toEqual({
      freeQuestionsPerAircraft: 50,
      previewQuestionsSignedOut: 2,
      announcement: "Back soon",
      passMarkPercent: 70,
      featuredAircraftCode: "DA40",
      aircraftInDevelopment: ["B737"],
      hiddenSections: [],
      hiddenItems: [],
      sectionLabels: {},
      itemOverrides: {},
    });
  });

  it("falls back to the default preview allowance on a corrupt row", () => {
    const rows = [{ key: "preview_questions_signed_out", value: "lots" }];
    expect(parseSettings(rows).previewQuestionsSignedOut).toBe(
      DEFAULT_SETTINGS.previewQuestionsSignedOut,
    );
  });

  it("keeps the preview allowance well below the free one by default", () => {
    // Not arithmetic for its own sake: the preview is what is given away to
    // anybody at all, and the free tier is what signing up is worth. If the
    // two ever met, signing up would buy nothing.
    expect(DEFAULT_SETTINGS.previewQuestionsSignedOut).toBeLessThan(
      DEFAULT_SETTINGS.freeQuestionsPerAircraft,
    );
  });

  it("falls back on a corrupt number rather than throwing", () => {
    const rows = [
      { key: "free_questions_per_aircraft", value: "not-a-number" },
    ];
    expect(parseSettings(rows).freeQuestionsPerAircraft).toBe(
      DEFAULT_SETTINGS.freeQuestionsPerAircraft,
    );
  });

  it("falls back on a negative or out-of-range stored number", () => {
    expect(
      parseSettings([{ key: "free_questions_per_aircraft", value: "-5" }])
        .freeQuestionsPerAircraft,
    ).toBe(DEFAULT_SETTINGS.freeQuestionsPerAircraft);
    expect(
      parseSettings([
        {
          key: "free_questions_per_aircraft",
          value: String(MAX_FREE_QUESTIONS + 1),
        },
      ]).freeQuestionsPerAircraft,
    ).toBe(DEFAULT_SETTINGS.freeQuestionsPerAircraft);
  });

  it("falls back on a corrupt or out-of-range stored pass mark", () => {
    expect(
      parseSettings([{ key: "pass_mark_percent", value: "not-a-number" }])
        .passMarkPercent,
    ).toBe(DEFAULT_SETTINGS.passMarkPercent);
    expect(
      parseSettings([{ key: "pass_mark_percent", value: "0" }]).passMarkPercent,
    ).toBe(DEFAULT_SETTINGS.passMarkPercent);
    expect(
      parseSettings([
        { key: "pass_mark_percent", value: String(MAX_PASS_MARK_PERCENT + 1) },
      ]).passMarkPercent,
    ).toBe(DEFAULT_SETTINGS.passMarkPercent);
  });

  it("falls back on a corrupt stored featured aircraft code", () => {
    expect(
      parseSettings([{ key: "featured_aircraft_code", value: "not valid!" }])
        .featuredAircraftCode,
    ).toBe(DEFAULT_SETTINGS.featuredAircraftCode);
  });

  it("drops an invalid code from a stored aircraft-in-development list rather than failing whole", () => {
    expect(
      parseSettings([
        { key: "aircraft_in_development", value: "DA40,not valid!" },
      ]).aircraftInDevelopment,
    ).toEqual(["DA40"]);
  });

  it("ignores an unknown key rather than erroring", () => {
    expect(parseSettings([{ key: "something_else", value: "1" }])).toEqual(
      DEFAULT_SETTINGS,
    );
  });
});

describe("settingsToRows", () => {
  it("round-trips through parseSettings", () => {
    const settings = {
      freeQuestionsPerAircraft: 42,
      previewQuestionsSignedOut: 7,
      announcement: "Round trip",
      passMarkPercent: 65,
      featuredAircraftCode: "B737",
      aircraftInDevelopment: ["DA40"],
      hiddenSections: [],
      hiddenItems: [],
      sectionLabels: {},
      itemOverrides: {},
    };
    expect(parseSettings(settingsToRows(settings))).toEqual(settings);
  });

  it("round-trips an empty aircraft-in-development list", () => {
    const settings = {
      freeQuestionsPerAircraft: 42,
      previewQuestionsSignedOut: 0,
      announcement: "",
      passMarkPercent: 65,
      featuredAircraftCode: "B737",
      aircraftInDevelopment: [] as string[],
      hiddenSections: [] as never[],
      hiddenItems: [] as string[],
      sectionLabels: {},
      itemOverrides: {},
    };
    expect(parseSettings(settingsToRows(settings))).toEqual(settings);
  });
});

describe("hidden sections", () => {
  it("keeps only known sections, once each, in a fixed order", () => {
    const result = validateSettings({
      ...valid,
      hiddenSections: ["pilot-sims", "bogus", "type-rating", "pilot-sims"],
    });
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.settings.hiddenSections).toEqual([
        "type-rating",
        "pilot-sims",
      ]);
  });

  it("defaults to nothing hidden, and survives a round trip", () => {
    expect(parseSettings([]).hiddenSections).toEqual([]);
    const rows = settingsToRows({
      ...DEFAULT_SETTINGS,
      hiddenSections: ["flying-knowledge"],
    });
    expect(parseSettings(rows).hiddenSections).toEqual(["flying-knowledge"]);
  });
});

describe("hidden items", () => {
  it("keeps only well-formed section:CODE keys, once each", () => {
    const result = validateSettings({
      ...valid,
      hiddenItems: [
        "type-rating:b737",
        "type-rating:B737",
        "nope:B737",
        "class-rating:",
        5,
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.settings.hiddenItems).toEqual(["type-rating:B737"]);
  });

  it("hides one item without hiding its siblings, and a hidden section hides all", () => {
    const base = { ...DEFAULT_SETTINGS, hiddenItems: ["class-rating:DA40"] };
    expect(isItemHidden(base, "class-rating", "da40")).toBe(true);
    expect(isItemHidden(base, "class-rating", "C152")).toBe(false);
    expect(isItemHidden(base, "type-rating", "DA40")).toBe(false);
    expect(
      isItemHidden(
        { ...base, hiddenSections: ["type-rating"] },
        "type-rating",
        "B737",
      ),
    ).toBe(true);
    expect(parseSettings(settingsToRows(base)).hiddenItems).toEqual([
      "class-rating:DA40",
    ]);
  });
});

describe("editable names", () => {
  it("keeps clean text, drops blanks and unknown keys, and trims length", () => {
    const result = validateSettings({
      ...valid,
      sectionLabels: {
        "type-rating": { title: "  Airliners  ", description: "" },
        bogus: { title: "x" },
      },
      itemOverrides: {
        "class-rating:DA40": {
          name: "Diamond DA40",
          description: "  A light   trainer. ",
        },
        "nope:DA40": { name: "x" },
        "type-rating:B737": { name: "   ", description: "" },
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settings.sectionLabels).toEqual({
        "type-rating": { title: "Airliners" },
      });
      expect(result.settings.itemOverrides).toEqual({
        "class-rating:DA40": {
          name: "Diamond DA40",
          description: "A light trainer.",
        },
      });
    }
  });

  it("shows the owner's wording but never changes the code, and falls back otherwise", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      sectionLabels: { "flying-knowledge": { title: "Ground School" } },
      itemOverrides: { "class-rating:DA40": { name: "DA40 TDI" } },
    };
    expect(sectionTitle(settings, "flying-knowledge")).toBe("Ground School");
    expect(sectionTitle(settings, "type-rating")).toBe(
      "Type Rating Systems Knowledge",
    );
    const row = { code: "DA40", name: "Diamond", description: "Light." };
    expect(withItemOverride(settings, "class-rating", row)).toEqual({
      code: "DA40",
      name: "DA40 TDI",
      description: "Light.",
    });
    expect(withItemOverride(settings, "type-rating", row)).toBe(row);
  });

  it("survives a round trip and ignores a corrupt stored value", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      sectionLabels: { "pilot-sims": { title: "Simulators" } },
      itemOverrides: { "type-rating:B737": { description: "Narrow-body." } },
    };
    expect(parseSettings(settingsToRows(settings))).toMatchObject({
      sectionLabels: settings.sectionLabels,
      itemOverrides: settings.itemOverrides,
    });
    const broken = parseSettings([
      { key: "section_labels", value: "{not json" },
      { key: "item_overrides", value: "[]" },
    ]);
    expect(broken.sectionLabels).toEqual({});
    expect(broken.itemOverrides).toEqual({});
  });
});
