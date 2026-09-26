import Link from "next/link";
import { notFound } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { TestBuilder, type BuilderPresets } from "@/components/practice-test/test-builder";
import { ResumeTestBanner } from "@/components/resume-test-banner";
import { Card, EmptyState, PageHeading } from "@/components/ui";
import { findIncompleteSession, type IncompleteSession } from "@/db/attempts";
import {
  countUnseenClassTestQuestions,
  getClassRating,
  listClassTopics,
  type ClassRatingSummary,
  type ClassTopicSummary,
} from "@/db/class-queries";
import { getFlaggedQuestionIds } from "@/db/flags";
import { countPreviewQuestionsAnswered } from "@/db/preview";
import { getQuestionIdsToRetry, getTopicPerformance } from "@/db/reports";
import { countQuestionsAnswered, getSubscription } from "@/db/subscriptions";
import { hasActiveSubscription, remainingFreeQuestions } from "@/lib/billing/access-policy";
import { getSiteSettings } from "@/db/settings";
import { getPreviewVisitorId } from "@/lib/auth/preview-visitor";
import { getCurrentUser } from "@/lib/auth/session";
import { studyGuideHref } from "@/lib/study-guide";
import { buildClassResumeHref, PRESET_COUNT_CEILING } from "@/lib/test-options";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return { title: code.toUpperCase() };
}

/**
 * A class rating's overview page — the same shape as `aircraft/[code]/page.tsx`,
 * reading class content instead. See the note atop
 * `class/[code]/test/actions.ts` for why the free-tier figure, the resume
 * banner and the quick presets all reuse the exact same queries the aircraft
 * page calls, just given a class code.
 */
export default async function ClassRatingPage({ params }: PageProps) {
  const { code } = await params;
  const classCode = code.toUpperCase();

  let ratingClass: ClassRatingSummary | null;
  let topics: ClassTopicSummary[];
  let incompleteSession: IncompleteSession | null = null;
  let remainingFree: number | null = null;
  let allowanceKind: "free-tier" | "preview" = "free-tier";
  let presets: BuilderPresets | null = null;

  try {
    [ratingClass, topics] = await Promise.all([
      getClassRating(classCode),
      listClassTopics(classCode),
    ]);

    const user = await getCurrentUser();
    if (user) {
      const [subscription, performance, flaggedIds, wrongIds, unseenCount, resumable] =
        await Promise.all([
          getSubscription(user.id),
          getTopicPerformance(user.id, classCode),
          getFlaggedQuestionIds(user.id, classCode),
          getQuestionIdsToRetry(user.id, classCode, PRESET_COUNT_CEILING),
          countUnseenClassTestQuestions(classCode, user.id),
          findIncompleteSession(user.id, classCode),
        ]);
      incompleteSession = resumable;

      if (!hasActiveSubscription(subscription)) {
        const [distinctAnswered, settings] = await Promise.all([
          countQuestionsAnswered(user.id, classCode),
          getSiteSettings(),
        ]);
        remainingFree = remainingFreeQuestions(distinctAnswered, settings.freeQuestionsPerAircraft);
      }

      presets = {
        weakTopics: performance
          .filter((topic) => topic.answered > 0)
          .slice(0, 2)
          .map((topic) => topic.topic),
        flaggedCount: flaggedIds.length,
        wrongCount: wrongIds.length,
        unseenCount: Math.min(unseenCount, PRESET_COUNT_CEILING),
      };
    } else {
      allowanceKind = "preview";
      const [visitorId, settings] = await Promise.all([getPreviewVisitorId(), getSiteSettings()]);
      const previewed = visitorId
        ? await countPreviewQuestionsAnswered(visitorId, classCode)
        : 0;
      remainingFree = remainingFreeQuestions(previewed, settings.previewQuestionsSignedOut);
    }
  } catch (error) {
    return (
      <>
        <PageHeading title={classCode} />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  if (!ratingClass) notFound();

  const guideHref = studyGuideHref(ratingClass.code);

  return (
    <>
      <PageHeading eyebrow={ratingClass.code} title={ratingClass.name} subtitle="Class rating" />

      <Card>
        <p className="text-sm text-muted-foreground">{ratingClass.description}</p>
        {guideHref ? (
          <p className="mt-3 text-sm">
            <Link
              href={guideHref}
              target="_blank"
              rel="noopener noreferrer"
              className="link-standalone font-medium text-brand hover:underline"
            >
              Read the study guide before you start →
            </Link>
          </p>
        ) : null}
      </Card>

      {incompleteSession ? (
        <div className="mt-6">
          <ResumeTestBanner
            session={incompleteSession}
            aircraftName={ratingClass.name}
            hrefBuilder={buildClassResumeHref}
          />
        </div>
      ) : null}

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-foreground">Build a practice test</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Questions are picked at random from the sections you choose.
        </p>

        {topics.length === 0 ? (
          <EmptyState title="No published questions yet">
            Add question files under{" "}
            <code className="font-mono">
              content/classes/{ratingClass.code.toLowerCase()}/questions/
            </code>{" "}
            and run <code className="font-mono">npm run db:seed</code>.
          </EmptyState>
        ) : (
          <Card>
            <TestBuilder
              aircraftCode={ratingClass.code}
              topics={topics}
              remainingFree={remainingFree}
              allowanceKind={allowanceKind}
              presets={presets}
              basePath="/class-rating"
            />
          </Card>
        )}
      </section>

      <p className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/class-rating"
          className="link-standalone text-sm font-medium text-brand hover:underline"
        >
          ← All class ratings
        </Link>
        <Link
          href={`/progress/class/${ratingClass.code}`}
          className="link-standalone text-sm font-medium text-brand hover:underline"
        >
          Your {ratingClass.code} progress →
        </Link>
      </p>
    </>
  );
}
