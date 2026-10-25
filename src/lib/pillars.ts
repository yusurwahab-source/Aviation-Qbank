import {
  isSectionHidden,
  sectionShortTitle,
  sectionTitle,
  type SectionKey,
  type SiteSettings,
} from "@/lib/settings";

/**
 * The three equal pillars the landing page and the header present. A pillar
 * is only a grouping over the four `SectionKey`s — nothing about how
 * sections are stored, hidden or relabelled changes. Type rating and class
 * rating share one pillar; their trees stay separate underneath.
 */
export const PILLAR_KEYS = ["atpl-ground-school", "aircraft-systems", "pilot-sims"] as const;
export type PillarKey = (typeof PILLAR_KEYS)[number];

export const PILLAR_HREFS: Record<PillarKey, string> = {
  "atpl-ground-school": "/atpl-ground-school",
  "aircraft-systems": "/aircraft-systems",
  "pilot-sims": "/pilot-sims",
};

const PILLAR_SECTIONS: Record<PillarKey, readonly SectionKey[]> = {
  "atpl-ground-school": ["flying-knowledge"],
  "aircraft-systems": ["type-rating", "class-rating"],
  "pilot-sims": ["pilot-sims"],
};

type PillarSettings = Pick<SiteSettings, "hiddenSections" | "sectionLabels">;

/** A pillar is hidden only when every section behind it is. */
export function isPillarHidden(settings: PillarSettings, pillar: PillarKey): boolean {
  return PILLAR_SECTIONS[pillar].every((section) => isSectionHidden(settings, section));
}

export function pillarTitle(settings: PillarSettings, pillar: PillarKey): string {
  if (pillar === "aircraft-systems") return "Aircraft";
  return sectionTitle(settings, PILLAR_SECTIONS[pillar][0]);
}

export function pillarShortTitle(settings: PillarSettings, pillar: PillarKey): string {
  if (pillar === "aircraft-systems") return "Aircraft";
  return sectionShortTitle(settings, PILLAR_SECTIONS[pillar][0]);
}

export function pillarForHref(href: string): PillarKey | undefined {
  return PILLAR_KEYS.find((key) => PILLAR_HREFS[key] === href);
}
