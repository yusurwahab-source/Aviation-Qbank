import Link from "next/link";
import type { Metadata } from "next";

import { Badge, Card, PageHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Hold Short",
  description: "An experimental space for new aviation learning ideas.",
};

export default function HoldShortPage() {
  return (
    <>
      <PageHeading
        eyebrow="Hold Short"
        title="A place for experiments"
        subtitle="We’re trying out new ways to make aviation learning useful and enjoyable."
      />

      <Card>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            This section is just getting started
          </h2>
          <Badge tone="brand">Experimental</Badge>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          This is a small experiment. More aviation tools and learning ideas may
          appear here over time.
        </p>
        <Link
          href="/pilot-sims"
          className="tap-target mt-4 inline-flex items-center font-semibold text-brand-ink"
        >
          Explore Pilot Sims →
        </Link>
      </Card>
    </>
  );
}
