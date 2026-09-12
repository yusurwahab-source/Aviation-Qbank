import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { ProgressReport, type ProgressReportData } from "@/components/progress-report";
import { PageHeading } from "@/components/ui";
import { getAircraft } from "@/db/queries";
import {
  getProgressOverTime,
  getQuestionsToRetry,
  getSummary,
  getTopicPerformance,
} from "@/db/reports";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return { title: `${code.toUpperCase()} progress` };
}

export default async function AircraftProgressPage({ params }: PageProps) {
  const { code } = await params;
  const aircraftCode = code.toUpperCase();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let data: ProgressReportData;
  let name = aircraftCode;

  try {
    const plane = await getAircraft(aircraftCode);
    if (!plane) notFound();
    name = plane.name;

    const [summary, topics, scores, retry] = await Promise.all([
      getSummary(user.id, aircraftCode),
      getTopicPerformance(user.id, aircraftCode),
      getProgressOverTime(user.id, aircraftCode),
      getQuestionsToRetry(user.id, aircraftCode),
    ]);
    data = { summary, topics, scores, retry, aircraftCode };
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_")) throw error;
    return (
      <>
        <PageHeading title={`${aircraftCode} progress`} />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  return (
    <>
      <PageHeading eyebrow={aircraftCode} title={`${name} progress`} />
      <ProgressReport data={data} />
      <p className="mt-8">
        <Link href="/progress" className="text-sm font-medium text-brand hover:underline">
          ← All aircraft
        </Link>
      </p>
    </>
  );
}
