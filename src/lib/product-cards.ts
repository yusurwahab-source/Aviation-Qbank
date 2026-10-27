import { isPillarHidden, PILLAR_HREFS, PILLAR_KEYS, type PillarKey } from "@/lib/pillars";
import type { SiteSettings } from "@/lib/settings";

/**
 * The homepage's three resource cards, as data: which ones show, what each
 * is called, where it goes, its picture and its short line.
 *
 * The titles and lines are fixed by the redesign brief rather than read
 * from the owner's section labels, which still name the sections
 * everywhere else. A card is left out when every section behind its pillar
 * is hidden, exactly as the header does.
 *
 * The lines name only what exists. The brief's "Calculators" is not in the
 * Flight Training Tools line because the site has none; the Logbook Scanner
 * is named instead. The ATPL figure is the live question count from the
 * database, and when the database did not answer (`null`) the card simply
 * shows no figure rather than a made-up one.
 *
 * The pictures live in `public/images/` under these names. Replacing one is
 * a matter of overwriting the file with another 16:9 image of the same name.
 */

export type ProductCardFacts = {
  /** Published questions across the live ATPL subjects. */
  atplQuestionCount: number | null;
};

export type CardImage = { src: string; alt: string };

export type ProductCard = {
  key: PillarKey;
  title: string;
  href: string;
  description: string;
  /** One short fact under the description, when there is a true one. */
  meta: string | null;
  image: CardImage;
};

export const HERO_IMAGE: CardImage = {
  src: "/images/pilotqbank-hero.webp",
  alt: "The glass-cockpit displays of a light aircraft in cruise, above scattered clouds",
};

/**
 * The hero's looping background clip, played over `HERO_IMAGE` — an MP4
 * in `public/videos/`, or `null` for the still picture alone. When a clip
 * is set, `HERO_IMAGE` should be its first frame so the fade-in is seamless.
 */
export const HERO_VIDEO_SRC: string | null = "/videos/pilotqbank-hero.mp4";

const CARDS: Record<PillarKey, { title: string; description: string; image: CardImage }> = {
  "atpl-ground-school": {
    title: "EASA ATPL Ground School",
    description: "Question Banks · Study Notes · Summaries",
    image: {
      src: "/images/atpl-ground-school.webp",
      alt: "An aeronautical chart, textbooks, study notes and a pilot headset on a desk",
    },
  },
  "aircraft-systems": {
    title: "Aircraft",
    description: "Systems Question Banks · Study Notes · Summaries",
    image: {
      src: "/images/aircraft.webp",
      alt: "A light training aircraft on the apron with a jet beyond",
    },
  },
  "pilot-sims": {
    title: "Flight Training Tools",
    description: "Simulators · Training Aids · Logbook Scanner",
    image: {
      src: "/images/flight-training-tools.webp",
      alt: "A flight simulator instrument panel",
    },
  },
};

/** "12,068 questions" — always in English digits, whatever the server's locale. */
export function formatQuestionCount(n: number): string {
  return `${n.toLocaleString("en-GB")} ${n === 1 ? "question" : "questions"}`;
}

function metaFor(key: PillarKey, facts: ProductCardFacts): string | null {
  if (key !== "atpl-ground-school") return null;
  const n = facts.atplQuestionCount;
  return n && n > 0 ? formatQuestionCount(n) : null;
}

export function buildProductCards(
  settings: Pick<SiteSettings, "hiddenSections" | "sectionLabels">,
  facts: ProductCardFacts,
): ProductCard[] {
  return PILLAR_KEYS.filter((key) => !isPillarHidden(settings, key)).map((key) => ({
    key,
    ...CARDS[key],
    href: PILLAR_HREFS[key],
    meta: metaFor(key, facts),
  }));
}
