import { isPillarHidden, PILLAR_HREFS, PILLAR_KEYS, type PillarKey } from "@/lib/pillars";
import type { SiteSettings } from "@/lib/settings";

/**
 * The homepage's three product cards, as data: which ones show, what each
 * is called, where it goes and what it says.
 *
 * The titles are fixed by the 2026-10-25 redesign brief ("ATPL Theory",
 * "Aircraft Knowledge & Systems", "Simulator & Tools") rather than read
 * from the owner's section labels, which still name the sections
 * everywhere else. A card is left out when every section behind its
 * pillar is hidden, exactly as the header does.
 *
 * Descriptions state only what is live. Counts and aircraft codes come
 * from the database; when it did not answer (`null`), each card falls back
 * to a sentence with no figures in it rather than a made-up number.
 */

export type ProductCardFacts = {
  /** Live ATPL subjects (active, with published questions). */
  liveAtplSubjects: number | null;
  /** Codes of the type and class rating aircraft with published questions. */
  aircraftCodes: string[] | null;
};

export type ProductCard = {
  key: PillarKey;
  title: string;
  href: string;
  description: string;
};

const TITLES: Record<PillarKey, string> = {
  "atpl-ground-school": "ATPL Theory",
  "aircraft-systems": "Aircraft Knowledge & Systems",
  "pilot-sims": "Simulator & Tools",
};

/** "A", "A and B", "A, B and C". */
export function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function describe(key: PillarKey, facts: ProductCardFacts): string {
  switch (key) {
    case "atpl-ground-school": {
      const n = facts.liveAtplSubjects;
      return n && n > 0
        ? `${n} EASA ATPL theory ${n === 1 ? "subject" : "subjects"} with explanations and study guides, free in full.`
        : "EASA ATPL theory subjects with explanations and study guides, free in full.";
    }
    case "aircraft-systems": {
      const codes = facts.aircraftCodes;
      return codes && codes.length > 0
        ? `Systems questions for the ${joinWithAnd(codes)}, from light trainers to airliners.`
        : "Systems questions for type ratings and class ratings, from light trainers to airliners.";
    }
    case "pilot-sims":
      return "Practise holding entries and VOR/NDB tracking on interactive trainers, plus study tools such as the Logbook Scanner.";
  }
}

export function buildProductCards(
  settings: Pick<SiteSettings, "hiddenSections" | "sectionLabels">,
  facts: ProductCardFacts,
): ProductCard[] {
  return PILLAR_KEYS.filter((key) => !isPillarHidden(settings, key)).map((key) => ({
    key,
    title: TITLES[key],
    href: PILLAR_HREFS[key],
    description: describe(key, facts),
  }));
}
