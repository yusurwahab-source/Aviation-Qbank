import { PageHeading } from "@/components/ui";

import { ExamRunner } from "./exam-runner";

export const metadata = { title: "Mock exam" };

export default function ExamPage() {
  return (
    <>
      <PageHeading
        eyebrow="Aviation English"
        title="Mock exam"
        subtitle="20 listening questions and 4 timed speaking tasks."
      />
      <ExamRunner />
    </>
  );
}
