import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeading } from "@/components/ui";

import { findPilotSim } from "../sims";

const sim = findPilotSim("heading-indicator");

export const metadata: Metadata = {
  title: "Heading Indicator Trainer — Pilot Sims",
  description: sim?.description,
};

export default function HeadingIndicatorPage() {
  if (!sim) notFound();

  return (
    <>
      <PageHeading
        eyebrow="Pilot Sims"
        title={sim.name}
        subtitle="Move the heading control to see how the directional gyro displays aircraft heading."
      />

      <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface">
        <iframe
          src={sim.file}
          title={sim.name}
          sandbox="allow-scripts"
          className="block h-[40rem] max-h-[75dvh] min-h-[32rem] w-full border-0"
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
