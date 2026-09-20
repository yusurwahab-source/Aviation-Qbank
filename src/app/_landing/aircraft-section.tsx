import Link from "next/link";

import { Card } from "@/components/ui";
import type { AircraftSummary } from "@/db/queries";

import { SectionHeading } from "./section-heading";

/**
 * The B737-800, presented on its own — the DA40 does not appear on this page
 * at all. Its bank is 22 questions against the 737's 800-plus, and putting
 * the two side by side would make the whole product look thin rather than
 * show off the one bank that is actually deep. It is not gone: `/aircraft`
 * still lists it, honestly labelled "In development".
 */
export function AircraftSection({ plane, systemCount }: { plane: AircraftSummary; systemCount: number }) {
  return (
    <section>
      <SectionHeading eyebrow="The aircraft" title="Built around the 737-800" />

      <Card className="mt-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand">
              {plane.code}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-foreground">{plane.name}</h3>
            <p className="text-sm text-muted-foreground">
              {plane.manufacturer}
              {plane.variant ? ` · ${plane.variant}` : ""}
            </p>
          </div>

          <Link
            href={`/aircraft/${plane.code}`}
            className="tap-target inline-flex shrink-0 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
          >
            Practise the 737
          </Link>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">{plane.description}</p>

        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-4">
          <div>
            <dt className="text-xs text-muted-foreground">Published questions</dt>
            <dd className="mt-0.5 text-lg font-semibold text-foreground">
              {plane.publishedQuestions}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Systems</dt>
            <dd className="mt-0.5 text-lg font-semibold text-foreground">{systemCount}</dd>
          </div>
        </dl>
      </Card>
    </section>
  );
}
