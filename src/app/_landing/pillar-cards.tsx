import Link from "next/link";
import type { ReactNode } from "react";

import { LiveBadge } from "@/components/live-badge";
import { FREE_MODE } from "@/config/free-mode";
import { Badge } from "@/components/ui";
import { PILOT_SIMS } from "@/app/pilot-sims/sims";
import type { AtplRow } from "@/lib/atpl-subjects";
import {
  isPillarHidden,
  PILLAR_HREFS,
  PILLAR_KEYS,
  pillarTitle,
  type PillarKey,
} from "@/lib/pillars";
import type { SectionCounts } from "@/lib/section-counts";
import { sectionDescription, type SiteSettings } from "@/lib/settings";

export type PillarsData = {
  typeRating: SectionCounts;
  classRating: SectionCounts;
  /** Every ATPL subject, live or not — the card shows the live ones and
   * counts the rest. */
  atplRows: AtplRow[];
  typeCodes: string[];
  classCodes: string[];
};

const AIRCRAFT_DESCRIPTION =
  "Type rating and class rating systems, aircraft by aircraft — learn how it works, so every wrong option rules itself out.";
const SIMS_DESCRIPTION =
  "Interactive trainers for the procedures worth seeing rather than memorising — holding entries, VOR and NDB tracking.";

/**
 * The three pillars the product is built around, as three large cards — the
 * hero's main act rather than a section a visitor has to scroll to reach.
 * None is ranked above another. Pilot Sims carries a "premium soon" badge
 * because it is meant to become a paid product; today it is free and
 * nothing gates it.
 *
 * Every figure is real, read from the same trees the pickers read. A pillar
 * with nothing behind it (every section hidden) is left out of the returned
 * list entirely, so the hero can render however many cards remain.
 *
 * This used to be its own section, `PillarsOverview`, titled "What's
 * inside" — merged into the hero on the owner's instruction so a visitor
 * sees where to start without scrolling past an explanation first. Its
 * section copy survives as the condensed bullets at the top of
 * `HowItWorks`.
 */
export function buildPillarCards(
  data: PillarsData,
  settings: Pick<SiteSettings, "hiddenSections" | "sectionLabels">,
): { key: PillarKey; node: ReactNode }[] {
  const liveRows = data.atplRows.filter((row) => row.live);
  const comingCount = data.atplRows.length - liveRows.length;

  const cards: Record<PillarKey, ReactNode> = {
    "atpl-ground-school": (
      <PillarCard
        href={PILLAR_HREFS["atpl-ground-school"]}
        title={pillarTitle(settings, "atpl-ground-school")}
        description={sectionDescription(settings, "flying-knowledge")}
        cta="Choose a subject"
        rows={[
          ...liveRows.map((row) => ({
            key: row.number,
            label: row.name,
            meta: <LiveBadge />,
          })),
          ...(comingCount > 0
            ? [{ key: "more", label: `${comingCount} more subjects`, meta: <Badge>Coming soon</Badge>, muted: true }]
            : []),
        ]}
      />
    ),
    "aircraft-systems": (
      <PillarCard
        href={PILLAR_HREFS["aircraft-systems"]}
        title={pillarTitle(settings, "aircraft-systems")}
        description={AIRCRAFT_DESCRIPTION}
        cta="Choose type or class"
        rows={[
          {
            key: "type",
            label: "Type Rating",
            detail: data.typeCodes.join(" · "),
            meta: <Badge tone="brand">{data.typeRating.questionCount} questions</Badge>,
          },
          {
            key: "class",
            label: "Class Rating",
            detail: data.classCodes.join(" · "),
            meta: <Badge tone="brand">{data.classRating.questionCount} questions</Badge>,
          },
        ]}
      />
    ),
    "pilot-sims": (
      <PillarCard
        href={PILLAR_HREFS["pilot-sims"]}
        title={pillarTitle(settings, "pilot-sims")}
        badge={FREE_MODE ? undefined : <Badge tone="brand">Premium soon</Badge>}
        description={SIMS_DESCRIPTION}
        cta="Open a trainer"
        rows={PILOT_SIMS.map((sim) => ({
          key: sim.slug,
          label: sim.name,
          meta: FREE_MODE ? null : <Badge>{sim.tier === "premium" ? "Premium" : "Free now"}</Badge>,
        }))}
      />
    ),
  };

  return PILLAR_KEYS.filter((pillar) => !isPillarHidden(settings, pillar)).map((pillar) => ({
    key: pillar,
    node: cards[pillar],
  }));
}

type PillarRow = {
  key: string;
  label: string;
  detail?: string;
  meta: ReactNode;
  muted?: boolean;
};

/**
 * One large card. Sits on `bg-surface-elevated` rather than the hero's own
 * `bg-surface`, so it lifts the same way every other panel in this product
 * lifts out of the background it sits on — the hero is the one place that
 * rule had not yet reached.
 */
function PillarCard({
  href,
  title,
  badge,
  description,
  rows,
  cta,
}: {
  href: string;
  title: string;
  badge?: ReactNode;
  description: string;
  rows: PillarRow[];
  cta: string;
}) {
  return (
    <Link href={href} className="block h-full">
      <div className="flex h-full flex-col rounded-xl border border-border bg-surface-elevated p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {badge}
        </div>

        <p className="mt-3 text-sm text-muted-foreground">{description}</p>

        <ul className="mt-4 flex flex-col divide-y divide-border border-y border-border">
          {rows.map((row) => (
            <li
              key={row.key}
              className={`flex min-h-11 items-center justify-between gap-3 py-2 ${row.muted ? "text-muted-foreground" : "text-foreground"}`}
            >
              <span className="min-w-0 text-sm">
                {row.label}
                {row.detail ? (
                  <span className="block truncate font-mono text-xs text-muted-foreground">
                    {row.detail}
                  </span>
                ) : null}
              </span>
              {row.meta}
            </li>
          ))}
        </ul>

        <p className="mt-auto pt-4 text-sm font-semibold text-brand-ink">{cta} →</p>
      </div>
    </Link>
  );
}
