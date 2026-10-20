import { PageHeading } from "@/components/ui";

import { ResultsReport } from "./results-report";

export const metadata = { title: "Results" };

export default async function ResultsPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  return (
    <>
      <PageHeading eyebrow="Aviation English" title="ICAO score report" />
      <ResultsReport examId={examId} />
    </>
  );
}
