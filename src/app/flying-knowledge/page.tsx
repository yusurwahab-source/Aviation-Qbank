import Link from "next/link";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Flying Knowledge",
  description: `Air law, meteorology, navigation and the rest of what a pilot keeps reviewing — the third section of ${siteConfig.name}, alongside type rating and class rating systems knowledge. Free in full.`,
};

/**
 * The third of the three sections the product is built around, alongside
 * `/type-rating` and `/class-rating` — see the note on the three sections
 * in `CLAUDE.md`. Unlike those two, nothing here is scoped to an aircraft's
 * type code, so there is no per-topic content tree or question bank behind
 * it yet: this is a real, honest "coming soon", the same convention an
 * aircraft or a class rating uses for a bank that is not ready
 * (`status: "coming_soon"`), applied to a whole section rather than one row
 * in a picker.
 *
 * Decided, ahead of any content existing: this section will be free in
 * full, never behind the free-tier cap or a subscription. It is material a
 * pilot reviews continuously rather than a bank sat once for one exam, and
 * metering it the way a type rating or class rating bank is metered would
 * work against the reason it exists.
 */
export default function FlyingKnowledgePage() {
  return (
    <>
      <PageHeading
        eyebrow="Flying Knowledge"
        title="What every pilot keeps reviewing"
        subtitle="Air law, meteorology, navigation and the rest of the ground-school syllabus — practised on its own, separate from any type or class rating, and free in full."
      />

      <ComingSoon note="No question bank exists for this section yet. Once one does, it will be added as a content-only job, exactly like a new type rating or class rating aircraft — and it will stay free in full, with no free-tier cap and no subscription gate.">
        <p>
          {siteConfig.name} is built around three sections:{" "}
          <Link href="/type-rating" className="font-medium text-brand hover:underline">
            Type Rating Systems Knowledge
          </Link>{" "}
          for large aircraft,{" "}
          <Link href="/class-rating" className="font-medium text-brand hover:underline">
            Class Rating Systems Knowledge
          </Link>{" "}
          for light aircraft, and Flying Knowledge for everything that is not
          aircraft-specific — the material every pilot needs to keep close and keep
          reviewing, not a bank sat once and moved past.
        </p>
        <p>
          When this section has a question bank, it will work the same way the other two do
          for study and exam mode, immediate feedback, a timed mock, and progress tracked by
          topic. What will not carry over is the free-tier cap: this section stays free in
          full, for everyone, signed in or not.
        </p>
      </ComingSoon>
    </>
  );
}
