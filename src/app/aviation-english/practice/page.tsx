import { PageHeading } from "@/components/ui";

import { PracticeHub } from "./practice-hub";

export const metadata = { title: "Practice" };

export default function PracticePage() {
  return (
    <>
      <PageHeading eyebrow="Aviation English" title="Practice hub" subtitle="Flashcards and read-back drills." />
      <PracticeHub />
    </>
  );
}
