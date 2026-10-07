import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeading } from "@/components/ui";

import { findPilotSim } from "../sims";

const sim = findPilotSim("holding-pattern-entry-trainer");

export const metadata: Metadata = {
  title: "Holding Pattern Entry Trainer — Pilot Sims",
  description: sim?.description,
};

/**
 * The trainer is a complete standalone page (`public/pilot-sims/`), shown
 * here in an iframe rather than re-implemented: its entry-sector maths and
 * SVG geometry were checked against FAA/ICAO sources as they stand, and
 * must not be edited from this side. (Its layout, the HSI's touch control
 * and the answer reveal were changed at the owner's request; the entry
 * rules and grading were not.)
 *
 * `sandbox="allow-scripts"` and nothing else — it needs to run, and needs
 * no access to this origin's cookies or storage. It is drawn at a phone's
 * proportions, so it is capped in width and centred on larger screens.
 */
export default function HoldingPatternEntryTrainerPage() {
  if (!sim) notFound();

  return (
    <>
      <PageHeading
        eyebrow="Pilot Sims"
        title={sim.name}
        subtitle="Practice mode shows the entry sector as you move the aircraft. Test mode gives an ATC clearance: set the inbound course on the HSI, pick the entry, confirm."
      />

      <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface">
        <iframe
          src={sim.file}
          title={sim.name}
          sandbox="allow-scripts"
          className="block h-[calc(100dvh-6rem)] max-h-[46rem] min-h-[34rem] w-full border-0"
        />
      </div>

      <p className="mt-6">
        <Link
          href="/pilot-sims"
          className="link-standalone text-sm font-medium text-brand-ink hover:underline"
        >
          ← All simulators
        </Link>
      </p>
    </>
  );
}
