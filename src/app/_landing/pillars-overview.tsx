import Link from "next/link";
import type { ReactNode } from "react";

import { LiveBadge } from "@/components/live-badge";
import { Badge, Card } from "@/components/ui";
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

import { SectionHeading } from "./section-heading";

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
 * The three pillars the product is built around, as three cards of identical
 * shape and weight: a title, a line of description, a short list of what is
 * inside, and one way in. None is ranked above another. Pilot Sims carries a
 * "premium soon" badge because it is meant to become a paid product; today
 * it is free and nothing gates it.
 *
 * Every figure is real, read from the same trees the pickers read. A pillar
 * with nothing behind it (every section hidden) is left out entirely.
 */
export function PillarsOverview({
  data,
  settings,
}: {
  data: PillarsData;
  settings: Pick<SiteSettings, "hiddenSections" | "sectionLabels">;
}) {
  const shown = PILLAR_KEYS.filter((pillar) => !isPillarHidden(settings, pillar));
  if (shown.length === 0) return null;

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
        badge={<Badge tone="brand">Premium soon</Badge>}
        description={SIMS_DESCRIPTION}
        cta="Open a trainer"
        rows={PILOT_SIMS.map((sim) => ({
          key: sim.slug,
          label: sim.name,
          meta: <Badge>{sim.tier === "premium" ? "Premium" : "Free now"}</Badge>,
        }))}
      />
    ),
  };

  return (
    <section id="whats-inside" className="scroll-mt-20">
      <SectionHeading
        eyebrow="What's inside"
        title={shown.length === 3 ? "Three ways to study, one way to learn" : "What you can study"}
        subtitle="Understand the aircraft and the exam, not just the answers — pick where you're starting."
      />

      <ul
        className={`mt-8 grid gap-4 ${shown.length === 3 ? "md:grid-cols-3" : shown.length === 2 ? "md:grid-cols-2" : ""}`}
      >
        {shown.map((pillar) => (
          <li key={pillar} className="h-full">
            {cards[pillar]}
          </li>
        ))}
      </ul>
    </section>
  );
}

type PillarRow = {
  key: string;
  label: string;
  detail?: string;
  meta: ReactNode;
  muted?: boolean;
};

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
      <Card className="flex h-full flex-col transition hover:border-brand hover:shadow-sm">
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
      </Card>
    </Link>
  );
}
