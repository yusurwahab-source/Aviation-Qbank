import { PageHeading } from "@/components/ui";

import { Dashboard } from "./_components/dashboard";

export default function AviationEnglishPage() {
  return (
    <>
      <PageHeading
        eyebrow="Aviation English"
        title="ICAO English Language Proficiency"
        subtitle="Prepare for Level 4 and above: lessons, drills and a mock exam. Progress is saved on this device."
      />
      <Dashboard />
    </>
  );
}
