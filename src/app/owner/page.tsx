import type { Metadata } from "next";
import Link from "next/link";

import { PageHeading } from "@/components/ui";
import { getSiteOverview } from "@/db/owner";
import { countOpenQuestionReports } from "@/db/question-reports";
import { requireOwner } from "@/lib/auth/require-owner";

import { OwnerNav, StatTile } from "./owner-ui";

export const metadata: Metadata = { title: "Owner" };
export const dynamic = "force-dynamic";

/**
 * The owner's front page: the six numbers worth knowing, and the way in to
 * everything else.
 *
 * Counts rather than charts on purpose — a chart of six numbers on a site
 * this size would be decoration, and `progress-chart.tsx` already carries
 * the one plot this application has earned.
 */
export default async function OwnerPage() {
  await requireOwner();
  const [overview, openReports] = await Promise.all([
    getSiteOverview(),
    countOpenQuestionReports(),
  ]);

  return (
    <>
      <PageHeading title="Owner" subtitle="Your site, in numbers." />
      <OwnerNav current="/owner" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="Accounts" value={overview.users} />
        <StatTile label="With access right now" value={overview.activeSubscribers} />
        <StatTile label="Tests finished" value={overview.testsCompleted} />
        <StatTile label="Questions answered" value={overview.answersRecorded} />
        <StatTile label="Aircraft requests" value={overview.interestSignups} />
        <StatTile label="Gift codes unused" value={overview.giftCodesUnredeemed} />
        <StatTile label="Open question reports" value={openReports} />
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        See signup and access trends, expiring subscriptions, and question quality signals at{" "}
        <Link href="/owner/insights" className="text-brand hover:underline">
          Insights
        </Link>
        .
      </p>
    </>
  );
}
