import { overrideItem } from "@/db/settings";
import { sectionTitle } from "@/lib/settings";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { TestBuilder, type BuilderPresets } from "@/components/practice-test/test-builder";
import { ResumeTestBanner } from "@/components/resume-test-banner";
import { Card, EmptyState, PageHeading } from "@/components/ui";
import { findIncompleteSession, type IncompleteSession } from "@/db/attempts";
import {
  countUnseenFlyingKnowledgeTestQuestions,
  getFlyingKnowledgeSubject,
  listFlyingKnowledgeTopics,
  type FlyingKnowledgeSubjectSummary,
  type FlyingKnowledgeTopicSummary,
} from "@/db/flying-knowledge-queries";
import { getFlaggedQuestionIds } from "@/db/flags";
import { getQuestionIdsToRetry, getTopicPerformance } from "@/db/reports";
import { getCurrentUser } from "@/lib/auth/session";
import { studyGuideHref } from "@/lib/study-guide";
import { buildFlyingKnowledgeResumeHref, PRESET_COUNT_CEILING } from "@/lib/test-options";
import { getVisibleSiteSettings } from "@/lib/settings-visibility";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return { title: code.toUpperCase() };
}

/**
 * A Flying Knowledge subject's overview page — the same shape as
 * `class-rating/[code]/page.tsx`, reading the subject content tree instead.
 * The one thing this page does *not* do that its type-rating and
 * class-rating equivalents do is compute a free-tier or preview allowance:
 * Flying Knowledge is free in full for everyone, signed in or not, so
 * `TestBuilder` is always given `remainingFree={null}` — its own documented
 * "no cap" case, the same one an active subscriber sees elsewhere. See the
 * note on the three sections in `CLAUDE.md`.
 */
export default async function FlyingKnowledgeSubjectPage({ params }: PageProps) {
  const { code } = await params;
  const subjectCode = code.toUpperCase();

  let subject: FlyingKnowledgeSubjectSummary | null;
  let topics: FlyingKnowledgeTopicSummary[];
  let incompleteSession: IncompleteSession | null = null;
  let presets: BuilderPresets | null = null;

  try {
    [subject, topics] = await Promise.all([
      getFlyingKnowledgeSubject(subjectCode).then((row) => overrideItem("flying-knowledge", row)),
      listFlyingKnowledgeTopics(subjectCode),
    ]);

    const user = await getCurrentUser();
    if (user) {
      const [performance, flaggedIds, wrongIds, unseenCount, resumable] = await Promise.all([
        getTopicPerformance(user.id, subjectCode),
        getFlaggedQuestionIds(user.id, subjectCode),
        getQuestionIdsToRetry(user.id, subjectCode, PRESET_COUNT_CEILING),
        countUnseenFlyingKnowledgeTestQuestions(subjectCode, user.id),
        findIncompleteSession(user.id, subjectCode),
      ]);
      incompleteSession = resumable;

      presets = {
        weakTopics: performance
          .filter((topic) => topic.answered > 0)
          .slice(0, 2)
          .map((topic) => topic.topic),
        flaggedCount: flaggedIds.length,
        wrongCount: wrongIds.length,
        unseenCount: Math.min(unseenCount, PRESET_COUNT_CEILING),
      };
    }
  } catch (error) {
    return (
      <>
        <PageHeading title={subjectCode} />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  if (!subject) notFound();

  const guideHref = studyGuideHref(subject.code);

  return (
    <>
      <PageHeading eyebrow={subject.code} title={subject.name} subtitle={sectionTitle(await getVisibleSiteSettings(), "flying-knowledge")} />

      <Card>
        <p className="text-sm text-muted-foreground">{subject.description}</p>
        {guideHref ? (
          <p className="mt-3 text-sm">
            <Link
              href={guideHref}
              target="_blank"
              rel="noopener noreferrer"
              className="link-standalone font-medium text-brand-ink hover:underline"
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
            aircraftName={subject.name}
            hrefBuilder={buildFlyingKnowledgeResumeHref}
          />
        </div>
      ) : null}

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-foreground">Build a practice quiz</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Questions are picked at random from the topics you choose. Free in full — no limit,
          signed in or not.
        </p>

        {topics.length === 0 ? (
          <EmptyState title="No published questions yet">
            Add question files under{" "}
            <code className="font-mono">
              content/flying-knowledge/{subject.code.toLowerCase()}/questions/
            </code>{" "}
            and run <code className="font-mono">npm run db:seed</code>.
          </EmptyState>
        ) : (
          <Card>
            <TestBuilder
              aircraftCode={subject.code}
              topics={topics}
              remainingFree={null}
              presets={presets}
              basePath="/flying-knowledge"
            />
          </Card>
        )}
      </section>

      <p className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/flying-knowledge"
          className="link-standalone text-sm font-medium text-brand-ink hover:underline"
        >
          ← All subjects
        </Link>
        <Link
          href={`/progress/flying-knowledge/${subject.code}`}
          className="link-standalone text-sm font-medium text-brand-ink hover:underline"
        >
          Your {subject.code} progress →
        </Link>
      </p>
    </>
  );
}
