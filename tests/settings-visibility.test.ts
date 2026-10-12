import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, isItemHidden, isSectionHidden, unhidden } from "@/lib/settings";

const hidden = {
  ...DEFAULT_SETTINGS,
  hiddenSections: ["class-rating" as const],
  hiddenItems: ["type-rating:B737"],
};

describe("unhidden", () => {
  it("clears hidden sections and items, so the owner sees them as normal", () => {
    const seen = unhidden(hidden);
    expect(isSectionHidden(seen, "class-rating")).toBe(false);
    expect(isItemHidden(seen, "type-rating", "B737")).toBe(false);
  });

  it("leaves the stored settings untouched for everyone else", () => {
    unhidden(hidden);
    expect(isSectionHidden(hidden, "class-rating")).toBe(true);
    expect(isItemHidden(hidden, "type-rating", "B737")).toBe(true);
  });

  it("keeps everything else the same", () => {
    const seen = unhidden(hidden);
    expect(seen.freeQuestionsPerAircraft).toBe(hidden.freeQuestionsPerAircraft);
    expect(seen.passMarkPercent).toBe(hidden.passMarkPercent);
  });
});
