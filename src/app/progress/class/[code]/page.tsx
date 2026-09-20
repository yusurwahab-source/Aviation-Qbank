import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { ProgressReport, type ProgressReportData } from "@/components/progress-report";
import { PageHeading } from "@/components/ui";
import { getClassRating } from "@/db/class-queries";
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

/**
 * A class rating's progress page — the same shape as
 * `progress/[code]/page.tsx`, reading a class rating instead of an
 * aircraft. `getSummary`, `getTopicPerformance` and `getProgressOverTime`
 * all read straight from `attempts`/`test_sessions` with no join to
 * `questions`, so they work unchanged for a class code.
 *
 * `getQuestionsToRetry` is the one exception: it inner-joins to `questions`
 * to drop retry entries whose content has been deleted, which means it
 * never matches a class-rating question id. The retry list on this page is
 * therefore always empty — a known gap, not a bug, and the same one the
 * class test builder's own "Questions I got wrong" preset has (it draws its
 * ids from the same query).
 */
export default async function ClassProgressPage({ params }: PageProps) {
  const { code } = await params;
  const classCode = code.toUpperCase();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let data: ProgressReportData;
  let name = classCode;

  try {
    const ratingClass = await getClassRating(classCode);
    if (!ratingClass) notFound();
    name = ratingClass.name;

    const [summary, topics, scores, retry] = await Promise.all([
      getSummary(user.id, classCode),
      getTopicPerformance(user.id, classCode),
      getProgressOverTime(user.id, classCode),
      getQuestionsToRetry(user.id, classCode),
    ]);
    data = { summary, topics, scores, retry, aircraftCode: classCode };
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_")) throw error;
    return (
      <>
        <PageHeading title={`${classCode} progress`} />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  return (
    <>
      <PageHeading eyebrow={classCode} title={`${name} progress`} />
      <ProgressReport data={data} />
      <p className="mt-8">
        <Link href="/progress" className="link-standalone text-sm font-medium text-brand hover:underline">
          ← All progress
        </Link>
      </p>
    </>
  );
}
