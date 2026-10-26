import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildProductCards, formatQuestionCount, HERO_IMAGE } from "@/lib/product-cards";
import type { SectionKey } from "@/lib/settings";

const settings = (hiddenSections: SectionKey[] = []) => ({ hiddenSections, sectionLabels: {} });
const facts = { atplQuestionCount: 12068 };

describe("product cards", () => {
  it("uses the three fixed titles, in pillar order, with the pillar routes", () => {
    const cards = buildProductCards(settings(), facts);
    expect(cards.map((c) => c.title)).toEqual(["EASA ATPL Ground School", "Aircraft", "Flight Training Tools"]);
    expect(cards.map((c) => c.href)).toEqual(["/atpl-ground-school", "/aircraft-systems", "/pilot-sims"]);
  });

  it("shows the ATPL question count on the ATPL card only", () => {
    const [atpl, aircraft, tools] = buildProductCards(settings(), facts);
    expect(atpl.meta).toBe("12,068 questions");
    expect(aircraft.meta).toBeNull();
    expect(tools.meta).toBeNull();
  });

  it("shows no figure when the database did not answer or nothing is live", () => {
    for (const count of [null, 0]) {
      const cards = buildProductCards(settings(), { atplQuestionCount: count });
      for (const card of cards) expect(card.meta).toBeNull();
    }
  });

  it("never promises a calculator the site does not have", () => {
    for (const card of buildProductCards(settings(), facts)) {
      expect(card.description.toLowerCase()).not.toContain("calculator");
    }
  });

  it("points every card and the hero at an image that exists", () => {
    const images = [HERO_IMAGE, ...buildProductCards(settings(), facts).map((c) => c.image)];
    for (const image of images) {
      expect(image.src).toMatch(/^\/images\/.+\.webp$/);
      expect(existsSync(path.join(process.cwd(), "public", image.src))).toBe(true);
      expect(image.alt.length).toBeGreaterThan(0);
    }
  });

  it("leaves out a card whose sections are all hidden", () => {
    const cards = buildProductCards(settings(["type-rating", "class-rating"]), facts);
    expect(cards.map((c) => c.key)).toEqual(["atpl-ground-school", "pilot-sims"]);
  });

  it("formats counts the way a sentence does", () => {
    expect(formatQuestionCount(1)).toBe("1 question");
    expect(formatQuestionCount(1234)).toBe("1,234 questions");
  });
});
