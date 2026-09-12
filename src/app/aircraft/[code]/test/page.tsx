import Link from "next/link";
import { notFound } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { EmptyState, PageHeading } from "@/components/ui";
import { getAircraft, pickTestQuestions, type TestQuestion } from "@/db/queries";
import { parseTestLength } from "@/lib/test-options";

import { TestRunner } from "./test-runner";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ questions?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  return { title: `${code.toUpperCase()} practice test` };
}

export default async function TestPage({ params, searchParams }: PageProps) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const aircraftCode = code.toUpperCase();
  const length = parseTestLength(query.questions);

  let plane;
  let questions: TestQuestion[];

  try {
    plane = await getAircraft(aircraftCode);
    if (!plane) notFound();
    // Only the question and its options cross to the browser. The correct
    // answer and the explanation stay on the server until the test is graded.
    questions = await pickTestQuestions(aircraftCode, length);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_")) throw error;
    return (
      <>
        <PageHeading title={`${aircraftCode} practice test`} />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  if (questions.length === 0) {
    return (
      <>
        <PageHeading title={`${plane.name} practice test`} />
        <EmptyState title="There are no published questions for this aircraft yet.">
          <Link href={`/aircraft/${plane.code}`} className="font-medium text-brand hover:underline">
            Back to {plane.code}
          </Link>
        </EmptyState>
      </>
    );
  }

  return (
    <TestRunner
      aircraftCode={plane.code}
      aircraftName={plane.name}
      questions={questions}
    />
  );
}
