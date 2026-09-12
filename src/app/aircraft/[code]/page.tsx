import Link from "next/link";
import { notFound } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Badge, Card, EmptyState, PageHeading } from "@/components/ui";
import { getAircraft, listTopics, type AircraftSummary, type TopicSummary } from "@/db/queries";
import { DEFAULT_TEST_LENGTH, TEST_LENGTHS } from "@/lib/test-options";

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

  try {
    [plane, topics] = await Promise.all([getAircraft(aircraftCode), listTopics(aircraftCode)]);
  } catch (error) {
    return (
      <>
        <PageHeading title={aircraftCode} />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  if (!plane) notFound();

  const available = plane.publishedQuestions;

  return (
    <>
      <PageHeading
        eyebrow={plane.code}
        title={plane.name}
        subtitle={`${plane.manufacturer}${plane.variant ? ` · ${plane.variant}` : ""}`}
      />

      <Card>
        <p className="text-sm text-muted-foreground">{plane.description}</p>

        {available === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            This aircraft has no published questions yet.
          </p>
        ) : (
          <>
            <h2 className="mt-5 text-sm font-semibold text-foreground">Start a practice test</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Questions are picked at random from the {available} published{" "}
              {available === 1 ? "question" : "questions"} for this aircraft.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {TEST_LENGTHS.filter((length) => length <= available || length === TEST_LENGTHS[0]).map(
                (length) => {
                  const count = Math.min(length, available);
                  const isDefault = length === DEFAULT_TEST_LENGTH;
                  return (
                    <Link
                      key={length}
                      href={`/aircraft/${plane.code}/test?questions=${count}`}
                      className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                        isDefault
                          ? "bg-brand text-white hover:bg-brand-strong"
                          : "border border-border bg-surface text-foreground hover:border-brand hover:text-brand"
                      }`}
                    >
                      {count} questions
                    </Link>
                  );
                },
              )}
            </div>
          </>
        )}
      </Card>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Topics in this bank</h2>
        {topics.length === 0 ? (
          <EmptyState title="No topics yet">
            Add question files under <code className="font-mono">content/{plane.code.toLowerCase()}/questions/</code>{" "}
            and run <code className="font-mono">npm run db:seed</code>.
          </EmptyState>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {topics.map((topic) => (
              <li
                key={topic.topic}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
              >
                <span className="text-sm font-medium text-foreground">{topic.topic}</span>
                <Badge>
                  {topic.questionCount} {topic.questionCount === 1 ? "question" : "questions"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6">
        <Link href="/" className="text-sm font-medium text-brand hover:underline">
          ← All aircraft
        </Link>
      </p>
    </>
  );
}
