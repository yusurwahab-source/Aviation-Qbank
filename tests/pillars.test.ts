import { describe, expect, it } from "vitest";

import { isPillarHidden, pillarForHref, pillarShortTitle, pillarTitle } from "@/lib/pillars";
import type { SectionKey } from "@/lib/settings";

const settings = (hiddenSections: SectionKey[] = [], sectionLabels = {}) => ({
  hiddenSections,
  sectionLabels,
});

describe("pillars", () => {
  it("hides Aircraft Systems only when both type and class rating are hidden", () => {
    expect(isPillarHidden(settings(["type-rating"]), "aircraft-systems")).toBe(false);
    expect(isPillarHidden(settings(["class-rating"]), "aircraft-systems")).toBe(false);
    expect(isPillarHidden(settings(["type-rating", "class-rating"]), "aircraft-systems")).toBe(true);
  });

  it("hides ATPL Ground School with the Flying Knowledge section", () => {
    expect(isPillarHidden(settings(["flying-knowledge"]), "atpl-ground-school")).toBe(true);
    expect(isPillarHidden(settings(["flying-knowledge"]), "pilot-sims")).toBe(false);
  });

  it("names each pillar, and honours an owner rename of the section behind it", () => {
    expect(pillarTitle(settings(), "atpl-ground-school")).toBe("EASA ATPL Ground School");
    expect(pillarShortTitle(settings(), "atpl-ground-school")).toBe("ATPL Ground School");
    expect(pillarTitle(settings(), "aircraft-systems")).toBe("Aircraft Systems Knowledge");
    expect(pillarTitle(settings(), "pilot-sims")).toBe("Pilot Sims & Flight Trainers");
    expect(
      pillarTitle(settings([], { "flying-knowledge": { title: "Ground School" } }), "atpl-ground-school"),
    ).toBe("Ground School");
  });

  it("finds a pillar from its link, and nothing else", () => {
    expect(pillarForHref("/aircraft-systems")).toBe("aircraft-systems");
    expect(pillarForHref("/pilot-sims")).toBe("pilot-sims");
    expect(pillarForHref("/pricing")).toBeUndefined();
    expect(pillarForHref("/type-rating")).toBeUndefined();
  });
});
