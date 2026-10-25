import { describe, expect, it } from "vitest";

import { buildProductCards, joinWithAnd } from "@/lib/product-cards";
import type { SectionKey } from "@/lib/settings";

const settings = (hiddenSections: SectionKey[] = []) => ({ hiddenSections, sectionLabels: {} });
const facts = { liveAtplSubjects: 13, aircraftCount: 5 };

describe("product cards", () => {
  it("uses the three fixed titles, in pillar order, with the pillar routes", () => {
    const cards = buildProductCards(settings(), facts);
    expect(cards.map((c) => c.title)).toEqual([
      "EASA ATPL Ground School",
      "Aircraft",
      "Flight Training Tools",
    ]);
    expect(cards.map((c) => c.href)).toEqual(["/atpl-ground-school", "/aircraft-systems", "/pilot-sims"]);
  });

  it("states live figures only, from the facts given", () => {
    const [atpl, aircraft] = buildProductCards(settings(), facts);
    expect(atpl.description).toContain("13 theory subjects");
    expect(aircraft.description).toContain("5 aircraft");
  });

  it("falls back to sentences without figures when the database did not answer", () => {
    const cards = buildProductCards(settings(), { liveAtplSubjects: null, aircraftCount: null });
    for (const card of cards) expect(card.description).not.toMatch(/\d/);
  });

  it("leaves out a card whose sections are all hidden", () => {
    const cards = buildProductCards(settings(["type-rating", "class-rating"]), facts);
    expect(cards.map((c) => c.key)).toEqual(["atpl-ground-school", "pilot-sims"]);
  });

  it("joins lists the way a sentence does", () => {
    expect(joinWithAnd([])).toBe("");
    expect(joinWithAnd(["A"])).toBe("A");
    expect(joinWithAnd(["A", "B"])).toBe("A and B");
    expect(joinWithAnd(["A", "B", "C"])).toBe("A, B and C");
  });
});
