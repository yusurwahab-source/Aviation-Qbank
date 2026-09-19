import Link from "next/link";
import { notFound } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Card, EmptyState, PageHeading } from "@/components/ui";
import { getAircraft, listTopics, type AircraftSummary, type TopicSummary } from "@/db/queries";
import { countQuestionsAnswered, getSubscription } from "@/db/subscriptions";
import { hasActiveSubscription, remainingFreeQuestions } from "@/lib/billing/access-policy";
import { getCurrentUser } from "@/lib/auth/session";

import { TestBuilder } from "./test-builder";

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
  /**
   * How many free questions a signed-in, unsubscribed student has left on
   * this aircraft — null means unlimited (subscribed, or signed out, which
   * is never metered; see the note in CLAUDE.md). Passed down so the
   * builder can never advertise more questions than `/test` will actually
   * deliver — the same "the button never promises more than it delivers"
   * rule the section counts already follow.
   */
  let remainingFree: number | null = null;

  try {
    [plane, topics] = await Promise.all([getAircraft(aircraftCode), listTopics(aircraftCode)]);

    const user = await getCurrentUser();
    if (user) {
      const subscription = await getSubscription(user.id);
      if (!hasActiveSubscription(subscription)) {
        const distinctAnswered = await countQuestionsAnswered(user.id, aircraftCode);
        remainingFree = remainingFreeQuestions(distinctAnswered);
      }
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
            <TestBuilder aircraftCode={plane.code} topics={topics} remainingFree={remainingFree} />
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
