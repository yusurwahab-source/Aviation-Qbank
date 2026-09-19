import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { ProgressReport, type ProgressReportData } from "@/components/progress-report";
import { ResumeTestBanner } from "@/components/resume-test-banner";
import { PageHeading } from "@/components/ui";
import { findIncompleteSession, type IncompleteSession } from "@/db/attempts";
import { getAircraft } from "@/db/queries";
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
  let incompleteSession: IncompleteSession | null = null;
  let incompleteAircraftName: string | undefined;

  try {
    const [summary, topics, scores, retry, aircraft, resumable] = await Promise.all([
      getSummary(user.id),
      getTopicPerformance(user.id),
      getProgressOverTime(user.id),
      getQuestionsToRetry(user.id),
      getPractisedAircraft(user.id),
      // Not scoped to one type: whichever test the student was last in the
      // middle of, on any aircraft, is the one worth surfacing here.
      findIncompleteSession(user.id),
    ]);
    data = { summary, topics, scores, retry, aircraft };
    incompleteSession = resumable;

    if (resumable) {
      const plane = await getAircraft(resumable.aircraftCode);
      incompleteAircraftName = plane?.name;
    }
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
      {incompleteSession ? (
        <ResumeTestBanner session={incompleteSession} aircraftName={incompleteAircraftName} />
      ) : null}
      <ProgressReport data={data} />
    </>
  );
}
