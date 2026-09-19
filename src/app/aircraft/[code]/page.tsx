import Link from "next/link";
import { notFound } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
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
import { getQuestionIdsToRetry, getTopicPerformance } from "@/db/reports";
import { countQuestionsAnswered, getSubscription } from "@/db/subscriptions";
import { getUserPlanState } from "@/db/users";
import { hasActiveSubscription, remainingFreeQuestions } from "@/lib/billing/access-policy";
import { isPremiumUser } from "@/lib/billing/plan-access";
import { getSiteSettings } from "@/db/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { PRESET_COUNT_CEILING } from "@/lib/test-options";

import { TestBuilder, type BuilderPresets } from "./test-builder";

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
   * How many free questions a signed-in, unsubscribed student has left on
   * this aircraft — null means unlimited (subscribed, or signed out, which
   * is never metered; see the note in CLAUDE.md). Passed down so the
   * builder can never advertise more questions than `/test` will actually
   * deliver — the same "the button never promises more than it delivers"
   * rule the section counts already follow.
   */
  let remainingFree: number | null = null;
  /**
   * The builder's quick presets, or null signed out — there is no history
   * to build "my weak systems" or "questions I got wrong" from, the same
   * gap that already means a signed-out visitor sees no flags or notes.
   */
  let presets: BuilderPresets | null = null;
  /** The free/premium tier from `src/config/plans.ts` — see the note on
   * `remainingFree` above for how this differs from the Phase 6 allowance.
   * Signed out counts as free, the same as everywhere else this is read. */
  let isPremium = false;

  try {
    [plane, topics] = await Promise.all([getAircraft(aircraftCode), listTopics(aircraftCode)]);

    const user = await getCurrentUser();
    if (user) {
      const [subscription, planState, performance, flaggedIds, wrongIds, unseenCount, resumable] =
        await Promise.all([
          getSubscription(user.id),
          getUserPlanState(user.id),
          getTopicPerformance(user.id, aircraftCode),
          getFlaggedQuestionIds(user.id, aircraftCode),
          getQuestionIdsToRetry(user.id, aircraftCode, PRESET_COUNT_CEILING),
          countUnseenTestQuestions(aircraftCode, user.id),
          findIncompleteSession(user.id, aircraftCode),
        ]);
      incompleteSession = resumable;
      isPremium = isPremiumUser({ plan: planState, subscription });

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

  return (
    <>
      <PageHeading
        eyebrow={plane.code}
        title={plane.name}
        subtitle={`${plane.manufacturer}${plane.variant ? ` · ${plane.variant}` : ""}`}
      />

      <Card>
        <p className="text-sm text-muted-foreground">{plane.description}</p>
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
              presets={presets}
              isPremium={isPremium}
            />
          </Card>
        )}
      </section>

      <p className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/aircraft"
          className="link-standalone text-sm font-medium text-brand hover:underline"
        >
          ← All aircraft
        </Link>
        <Link
          href={`/progress/${plane.code}`}
          className="link-standalone text-sm font-medium text-brand hover:underline"
        >
          Your {plane.code} progress →
        </Link>
      </p>
    </>
  );
}
