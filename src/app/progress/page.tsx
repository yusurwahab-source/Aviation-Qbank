import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { ProgressReport, type ProgressReportData } from "@/components/progress-report";
import { PageHeading } from "@/components/ui";
import {
  getPractisedAircraft,
  getProgressOverTime,
  getQuestionsToRetry,
  getSummary,
  getTopicPerformance,
} from "@/db/reports";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Your progress" };
export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = await getCurrentUser();
  // A report is a private study history; there is nothing to show a stranger.
  if (!user) redirect("/login");

  let data: ProgressReportData;

  try {
    const [summary, topics, scores, retry, aircraft] = await Promise.all([
      getSummary(user.id),
      getTopicPerformance(user.id),
      getProgressOverTime(user.id),
      getQuestionsToRetry(user.id),
      getPractisedAircraft(user.id),
    ]);
    data = { summary, topics, scores, retry, aircraft };
  } catch (error) {
    return (
      <>
        <PageHeading title="Your progress" />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Your progress"
        subtitle="Everything you have practised, across every aircraft."
      />
      <ProgressReport data={data} />
    </>
  );
}
