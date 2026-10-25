import Link from "next/link";
import type { ReactNode } from "react";

import type { AtplRow } from "@/lib/atpl-subjects";
import { isPillarHidden, PILLAR_HREFS, PILLAR_KEYS, type PillarKey } from "@/lib/pillars";
import type { SectionCounts } from "@/lib/section-counts";
import type { SiteSettings } from "@/lib/settings";

/**
 * Kept as the shape `page.tsx` computes and `Hero` takes — `sectionsOk`
 * being true is still what tells the hero there is real data behind these
 * three cards rather than a database that failed to answer. The cards
 * themselves no longer read the counts: see the note on `buildPillarCards`
 * below for why.
 */
export type PillarsData = {
  typeRating: SectionCounts;
  classRating: SectionCounts;
  /** Every ATPL subject, live or not. Unused by the card row itself today —
   * kept on the type because `page.tsx` already computes it for this shape
   * and nothing is gained by splitting it into a narrower type the one
   * caller would have to maintain in parallel. */
  atplRows: AtplRow[];
  typeCodes: string[];
  classCodes: string[];
};

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
} as const;

/** An open book — EASA ATPL Ground School is the subject you read. */
function BookIcon() {
  return (
    <svg {...ICON_PROPS} className="h-5 w-5">
      <path d="M4 5.5c2.2-1 4.8-1 7 0v12.8c-2.2-1-4.8-1-7 0V5.5Z" />
      <path d="M20 5.5c-2.2-1-4.8-1-7 0v12.8c2.2-1 4.8-1 7 0V5.5Z" />
    </svg>
  );
}

/** Feather's own "send" glyph — a paper aeroplane reads as flight without
 * needing a literal aircraft silhouette at 20px. */
function PlaneIcon() {
  return (
    <svg {...ICON_PROPS} className="h-5 w-5">
      <path d="M21.5 2.5 10.5 13.5" />
      <path d="M21.5 2.5 14.8 21.5 10.5 13.5 2.5 9.2 21.5 2.5Z" />
    </svg>
  );
}

/** A game controller — the sims are the one pillar you fly rather than read. */
function JoystickIcon() {
  return (
    <svg {...ICON_PROPS} className="h-5 w-5">
      <rect x="3" y="8" width="18" height="9" rx="4.5" />
      <path d="M8 10.5v4.5M5.75 12.75h4.5" />
      <circle cx="15.5" cy="11.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="13.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

const PILLAR_CARD_CONTENT: Record<PillarKey, { title: string; icon: ReactNode }> = {
  "atpl-ground-school": { title: "EASA ATPL Theory", icon: <BookIcon /> },
  "aircraft-systems": { title: "Aircraft", icon: <PlaneIcon /> },
  "pilot-sims": { title: "Simulator", icon: <JoystickIcon /> },
};

/**
 * The three pillars as the hero's main act — one icon, one word, one
 * arrow. This replaces an earlier version of this card that listed live
 * subjects, aircraft codes and question counts directly on the card: a
 * premium-feeling landing page leads with "what is this and where do I go",
 * not a data table, and that detail still lives one click away on each
 * pillar's own picker page. `data`'s counts are therefore read by nothing
 * here any more — the type survives (see the note above) because `Hero`
 * still needs it for the "did the database answer" check.
 *
 * A pillar with every section behind it hidden is left out of the returned
 * list entirely, so the hero can render however many cards remain (the
 * three-column grid collapses gracefully — see `hero.tsx`).
 */
export function buildPillarCards(
  settings: Pick<SiteSettings, "hiddenSections" | "sectionLabels">,
): { key: PillarKey; node: ReactNode }[] {
  return PILLAR_KEYS.filter((pillar) => !isPillarHidden(settings, pillar)).map((pillar) => ({
    key: pillar,
    node: (
      <PillarCard
        href={PILLAR_HREFS[pillar]}
        title={PILLAR_CARD_CONTENT[pillar].title}
        icon={PILLAR_CARD_CONTENT[pillar].icon}
      />
    ),
  }));
}

/**
 * One minimal card: an icon chip, a title, an arrow that nudges on hover.
 * `group` on the link is what lets the arrow's own `group-hover:` react to
 * a hover anywhere on the card, not only when the pointer is over the arrow
 * glyph itself.
 */
function PillarCard({ href, title, icon }: { href: string; title: string; icon: ReactNode }) {
  return (
    <Link
      href={href}
      className="group block h-full rounded-xl border border-border bg-surface p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
        {icon}
      </span>

      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>

      <span className="mt-3 inline-flex items-center text-sm font-semibold text-brand-ink">
        <span className="inline-block transition-transform duration-300 ease-out group-hover:translate-x-0.5">
          →
        </span>
      </span>
    </Link>
  );
}
