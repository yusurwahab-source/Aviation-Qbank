import Link from "next/link";
import { notFound } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { TestBuilder, type BuilderPresets } from "@/components/practice-test/test-builder";
import { ResumeTestBanner } from "@/components/resume-test-banner";
import { Card, EmptyState, PageHeading } from "@/components/ui";
import { findIncompleteSession, type IncompleteSession } from "@/db/attempts";
import { getFlaggedQuestionIds } from "@/db/flags";
import {
  countUnseenTestQuestions,
  getAircraft,
  listTopics,
  type AircraftSummary,
  type TopicSummary,
} from "@/db/queries";
import { countPreviewQuestionsAnswered } from "@/db/preview";
import { getQuestionIdsToRetry, getTopicPerformance } from "@/db/reports";
import { countQuestionsAnswered, getSubscription } from "@/db/subscriptions";
import { hasActiveSubscription, remainingFreeQuestions } from "@/lib/billing/access-policy";
import { getSiteSettings, overrideItem } from "@/db/settings";
import { getPreviewVisitorId } from "@/lib/auth/preview-visitor";
import { getCurrentUser } from "@/lib/auth/session";
import { studyGuideHref } from "@/lib/study-guide";
import { PRESET_COUNT_CEILING } from "@/lib/test-options";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return { title: code.toUpperCase() };
}

export default async function AircraftPage({ params }: PageProps) {
  const { code } = await params;
  const aircraftCode = code.toUpperCase();

  let plane: AircraftSummary | null;
  let topics: TopicSummary[];
  let incompleteSession: IncompleteSession | null = null;
  /**
   * How many questions of the caller's allowance are left on this aircraft
   * — null means unlimited, which now only means an active subscription.
   * Passed down so the builder can never advertise more questions than
   * `/test` will actually deliver — the same "the button never promises
   * more than it delivers" rule the section counts already follow.
   *
   * Signed out this is the preview allowance, and it used to be null: the
   * builder offered a visitor with no account the whole bank, and `/test`
   * duly handed it over. Both ends are metered now.
   */
  let remainingFree: number | null = null;
  /** Which allowance the number above is, so the builder knows whether the
   * way past it is a subscription or an account. */
  let allowanceKind: "free-tier" | "preview" = "free-tier";
  /**
   * The builder's quick presets, or null signed out — there is no history
   * to build "my weak systems" or "questions I got wrong" from, the same
   * gap that already means a signed-out visitor sees no flags or notes.
   */
  let presets: BuilderPresets | null = null;

  try {
    [plane, topics] = await Promise.all([getAircraft(aircraftCode).then((row) => overrideItem("type-rating", row)), listTopics(aircraftCode)]);

    const user = await getCurrentUser();
    if (user) {
      const [subscription, performance, flaggedIds, wrongIds, unseenCount, resumable] =
        await Promise.all([
          getSubscription(user.id),
          getTopicPerformance(user.id, aircraftCode),
          getFlaggedQuestionIds(user.id, aircraftCode),
          getQuestionIdsToRetry(user.id, aircraftCode, PRESET_COUNT_CEILING),
          countUnseenTestQuestions(aircraftCode, user.id),
          findIncompleteSession(user.id, aircraftCode),
        ]);
      incompleteSession = resumable;

      if (!hasActiveSubscription(subscription)) {
        const [distinctAnswered, settings] = await Promise.all([
          countQuestionsAnswered(user.id, aircraftCode),
          getSiteSettings(),
        ]);
        remainingFree = remainingFreeQuestions(distinctAnswered, settings.freeQuestionsPerAircraft);
      }

      presets = {
        // A topic with nothing answered yet is not "weak" — it is untried —
        // so only ones with an actual score are candidates, weakest first
        // exactly as `getTopicPerformance` already sorts them.
        weakTopics: performance
          .filter((topic) => topic.answered > 0)
          .slice(0, 2)
          .map((topic) => topic.topic),
        flaggedCount: flaggedIds.length,
        wrongCount: wrongIds.length,
        unseenCount: Math.min(unseenCount, PRESET_COUNT_CEILING),
      };
    } else {
      // Signed out: the same figure against the preview allowance. Reading
      // the cookie is all a server component may do — no id yet simply
      // means nothing has been previewed, which is the honest starting
      // point. `answerQuestion` mints one when the first question is spent.
      allowanceKind = "preview";
      const [visitorId, settings] = await Promise.all([getPreviewVisitorId(), getSiteSettings()]);
      const previewed = visitorId
        ? await countPreviewQuestionsAnswered(visitorId, aircraftCode)
        : 0;
      remainingFree = remainingFreeQuestions(previewed, settings.previewQuestionsSignedOut);
    }
  } catch (error) {
    return (
      <>
        <PageHeading title={aircraftCode} />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  if (!plane) notFound();

  const guideHref = studyGuideHref(plane.code);

  return (
    <>
      <PageHeading
        eyebrow={plane.code}
        title={plane.name}
        subtitle={`${plane.manufacturer}${plane.variant ? ` · ${plane.variant}` : ""}`}
      />

      <Card>
        <p className="text-sm text-muted-foreground">{plane.description}</p>
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
          <ResumeTestBanner session={incompleteSession} aircraftName={plane.name} />
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
            <code className="font-mono">content/{plane.code.toLowerCase()}/questions/</code> and run{" "}
            <code className="font-mono">npm run db:seed</code>.
          </EmptyState>
        ) : (
          <Card>
            <TestBuilder
              aircraftCode={plane.code}
              topics={topics}
              remainingFree={remainingFree}
              allowanceKind={allowanceKind}
              presets={presets}
              basePath="/type-rating"
            />
          </Card>
        )}
      </section>

      <p className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/type-rating"
          className="link-standalone text-sm font-medium text-brand-ink hover:underline"
        >
          ← All type ratings
        </Link>
        <Link
          href={`/progress/${plane.code}`}
          className="link-standalone text-sm font-medium text-brand-ink hover:underline"
        >
          Your {plane.code} progress →
        </Link>
      </p>
    </>
  );
}
