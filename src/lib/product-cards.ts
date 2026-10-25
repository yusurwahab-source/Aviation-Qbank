import { isPillarHidden, PILLAR_HREFS, PILLAR_KEYS, type PillarKey } from "@/lib/pillars";
import type { SiteSettings } from "@/lib/settings";

/**
 * The homepage's three resource cards, as data: which ones show, what each
 * is called, where it goes and the one short line under its title.
 *
 * The titles are fixed by the gateway redesign brief ("EASA ATPL Ground
 * School", "Aircraft", "Flight Training Tools") rather than read from the
 * owner's section labels, which still name the sections everywhere else. A
 * card is left out when every section behind its pillar is hidden, exactly
 * as the header does.
 *
 * Lines state only what is live. Counts come from the database; when it did
 * not answer (`null`), each card falls back to a line with no figure in it
 * rather than a made-up number.
 */

export type ProductCardFacts = {
  /** Live ATPL subjects (active, with published questions). */
  liveAtplSubjects: number | null;
  /** Type and class rating aircraft with published questions. */
  aircraftCount: number | null;
};

export type ProductCard = {
  key: PillarKey;
  title: string;
  href: string;
  description: string;
};

const TITLES: Record<PillarKey, string> = {
  "atpl-ground-school": "EASA ATPL Ground School",
  "aircraft-systems": "Aircraft",
  "pilot-sims": "Flight Training Tools",
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
        ? `${n} theory ${n === 1 ? "subject" : "subjects"}, free in full.`
        : "ATPL theory subjects, free in full.";
    }
    case "aircraft-systems": {
      const n = facts.aircraftCount;
      return n && n > 0
        ? `Systems study and question banks for ${n} aircraft.`
        : "Systems study and question banks.";
    }
    case "pilot-sims":
      return "Simulators and pilot tools.";
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
