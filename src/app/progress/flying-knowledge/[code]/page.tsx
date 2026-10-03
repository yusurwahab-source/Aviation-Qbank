import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { ProgressReport, type ProgressReportData } from "@/components/progress-report";
import { PageHeading } from "@/components/ui";
import { getFlyingKnowledgeSubject } from "@/db/flying-knowledge-queries";
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
 * A Flying Knowledge subject's progress page — the same shape as
 * `progress/class/[code]/page.tsx`, reading a subject instead of a class
 * rating. `getSummary`, `getTopicPerformance` and `getProgressOverTime` all
 * read straight from `attempts`/`test_sessions` with no join to questions,
 * so they work unchanged for a subject code.
 *
 * `getQuestionsToRetry` has the same known gap here it has on the class
 * rating progress page: it inner-joins to `questions` (the type-rating
 * table), which a Flying Knowledge question id never matches, so the retry
 * list on this page is always empty. Not a bug introduced here — the same
 * gap already documented for class ratings.
 */
export default async function FlyingKnowledgeProgressPage({ params }: PageProps) {
  const { code } = await params;
  const subjectCode = code.toUpperCase();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let data: ProgressReportData;
  let name = subjectCode;

  try {
    const subject = await getFlyingKnowledgeSubject(subjectCode);
    if (!subject) notFound();
    name = subject.name;

    const [summary, topics, scores, retry] = await Promise.all([
      getSummary(user.id, subjectCode),
      getTopicPerformance(user.id, subjectCode),
      getProgressOverTime(user.id, subjectCode),
      getQuestionsToRetry(user.id, subjectCode),
    ]);
    data = { summary, topics, scores, retry, aircraftCode: subjectCode };
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_")) throw error;
    return (
      <>
        <PageHeading title={`${subjectCode} progress`} />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  return (
    <>
      <PageHeading eyebrow={subjectCode} title={`${name} progress`} />
      <ProgressReport data={data} />
      <p className="mt-8">
        <Link href="/progress" className="link-standalone text-sm font-medium text-brand-ink hover:underline">
          ← All progress
        </Link>
      </p>
    </>
  );
}
