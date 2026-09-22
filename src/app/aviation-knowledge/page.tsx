import Link from "next/link";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Aviation knowledge",
  description: `General aviation theory, not tied to one aircraft — the third section of ${siteConfig.name}, alongside type ratings and class ratings.`,
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
 */
export default function AviationKnowledgePage() {
  return (
    <>
      <PageHeading
        eyebrow="Aviation knowledge"
        title="General aviation theory, not tied to one aircraft"
        subtitle="Air law, meteorology, navigation and the rest of the ground-school syllabus — practised on its own, separate from any type or class rating."
      />

      <ComingSoon note="No question bank exists for this section yet. Once one does, it will be added as a content-only job, exactly like a new type rating or class rating.">
        <p>
          {siteConfig.name} is built around three sections: a{" "}
          <Link href="/type-rating" className="font-medium text-brand hover:underline">
            type rating
          </Link>{" "}
          bank for large aircraft, a{" "}
          <Link href="/class-rating" className="font-medium text-brand hover:underline">
            class rating
          </Link>{" "}
          bank for light aircraft, and this section for everything that is not
          aircraft-specific — the theory every pilot studies regardless of what they fly.
        </p>
        <p>
          When this section has a question bank, it will work exactly the way the other two
          do: study or exam mode, immediate feedback or a timed mock, progress tracked by
          topic, and a free allowance before a subscription is needed.
        </p>
      </ComingSoon>
    </>
  );
}
