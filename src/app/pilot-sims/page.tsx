import Link from "next/link";
import type { Metadata } from "next";

import { Badge, Card, PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";

import { PILOT_SIMS } from "./sims";

export const metadata: Metadata = {
  title: "Pilot Sims",
  description: `Interactive simulators for the procedures a pilot has to see to understand. Free on ${siteConfig.name}.`,
};

/**
 * Pilot Sims' own index. Unlike the three question-bank sections it reads
 * no database: a simulator is a static page, so this list is a constant
 * (`sims.ts`) and the page renders without a `DatabaseUnavailable` branch.
 */
export default function PilotSimsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Pilot Sims"
        title="Choose a simulator"
        subtitle="Procedures worth seeing rather than memorising — practised by hand, on a screen that works on a phone."
      />

      <ul className="grid gap-4 sm:grid-cols-2">
        {PILOT_SIMS.map((sim) => (
          <li key={sim.slug}>
            <Link href={`/pilot-sims/${sim.slug}`} className="block h-full">
              <Card className="h-full transition hover:border-brand hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground">{sim.name}</h2>
                  <Badge tone="brand">{sim.tier === "premium" ? "Premium" : "Simulator"}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{sim.description}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 mb-4 text-lg font-semibold text-foreground">Tools</h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        <li>
          <Link href="/tools/logbook" className="block h-full">
            <Card className="h-full transition hover:border-brand hover:shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-foreground">Logbook Scanner</h3>
                <Badge tone="brand">Tool</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Photograph your paper EASA logbook and get a verified e-logbook — every page total and
                carry-forward checked, with a guide to correcting the paper. First two spreads free.
              </p>
            </Card>
          </Link>
        </li>
      </ul>
    </>
  );
}
