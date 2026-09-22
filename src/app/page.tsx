import { DatabaseUnavailable } from "@/components/database-unavailable";
import { siteConfig } from "@/config/site";
import { listClassRatings, listClassTopics } from "@/db/class-queries";
import { listFlyingKnowledgeSubjects, listFlyingKnowledgeTopics } from "@/db/flying-knowledge-queries";
import { listAircraft, listTopics } from "@/db/queries";
import { getSiteSettings } from "@/db/settings";
import { appUrl } from "@/lib/email/send";

import { Faq } from "./_landing/faq";
import { Features } from "./_landing/features";
import { FinalCta } from "./_landing/final-cta";
import type { HeroStats } from "./_landing/hero";
import { Hero } from "./_landing/hero";
import { HowItWorks } from "./_landing/how-it-works";
import { SectionsOverview, type SectionCounts } from "./_landing/sections-overview";
import { Trust } from "./_landing/trust";

/**
 * The marketing landing page.
 *
 * Everything that does not depend on the database — the hero copy, the
 * trust block, how it works, features, the FAQ, the final CTA — renders
 * unconditionally, so a database hiccup narrows the page rather than taking
 * it down. Only the section that shows real numbers (`SectionsOverview`)
 * falls back to an honest notice instead of a made-up count.
 *
 * Statically rendered with an hourly revalidation, matching the brief: the
 * numbers on this page are real but do not need to be to-the-second.
 */
export const revalidate = 3600;

type LandingData = {
  /** False on failure — a live platform fact with no honest zero to fall
   * back to, the same reasoning `totalAircraft` used before the three
   * sections existed. */
  sectionsOk: boolean;
  typeRating: SectionCounts;
  classRating: SectionCounts;
  flyingKnowledge: SectionCounts;
  /** Distinct-topic count summed across every aircraft, class rating and
   * Flying Knowledge subject — each one's own systems, not deduplicated
   * against another's, because a "Fuel System" quiz on one aircraft is a
   * different surface from another aircraft's. */
  totalSystems: number;
};

/**
 * Sums real counts across both content trees — aircraft (type ratings) and
 * class ratings — rather than reading one featured aircraft's own numbers,
 * which is what this page did before it was three sections instead of one.
 * The fleet is small enough that a query per aircraft for its topic count
 * is fine at this size, the same trade `insights.ts` already makes for its
 * own per-owner-page queries.
 */
async function loadLandingData(): Promise<LandingData> {
  try {
    const [fleet, classes, subjects] = await Promise.all([
      listAircraft(),
      listClassRatings(),
      listFlyingKnowledgeSubjects(),
    ]);

    const [fleetTopics, classTopics, flyingTopics] = await Promise.all([
      Promise.all(fleet.map((plane) => listTopics(plane.code))),
      Promise.all(classes.map((ratingClass) => listClassTopics(ratingClass.code))),
      Promise.all(subjects.map((subject) => listFlyingKnowledgeTopics(subject.code))),
    ]);

    const typeRating = summarise(fleet);
    const classRating = summarise(classes);
    const flyingKnowledge = summarise(subjects);
    const totalSystems =
      fleetTopics.reduce((sum, topics) => sum + topics.length, 0) +
      classTopics.reduce((sum, topics) => sum + topics.length, 0) +
      flyingTopics.reduce((sum, topics) => sum + topics.length, 0);

    return { sectionsOk: true, typeRating, classRating, flyingKnowledge, totalSystems };
  } catch {
    const empty: SectionCounts = { aircraftCount: 0, questionCount: 0 };
    return {
      sectionsOk: false,
      typeRating: empty,
      classRating: empty,
      flyingKnowledge: empty,
      totalSystems: 0,
    };
  }
}

function summarise(rows: { publishedQuestions: number }[]): SectionCounts {
  return {
    aircraftCount: rows.length,
    questionCount: rows.reduce((sum, row) => sum + row.publishedQuestions, 0),
  };
}

/**
 * Organization + Course JSON-LD, built from the same facts as the rest of
 * the page — no rating, review count or enrolment figure appears anywhere
 * here, because none exists to report honestly.
 *
 * The Course entry names one aircraft by example (`featuredAircraftCode`,
 * an owner setting) because structured data needs a concrete `url`, not
 * because the product leads with it — see the note on `featuredAircraftCode`
 * in `lib/settings.ts`.
 */
function jsonLd(featuredAircraftCode: string): { "@type": string; [key: string]: unknown }[] {
  const base = appUrl();

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteConfig.name,
      url: base,
      logo: `${base}/icon-512.png`,
      description: siteConfig.description,
    },
    {
      "@context": "https://schema.org",
      "@type": "Course",
      name: `${siteConfig.name} — type rating and class rating practice questions`,
      description:
        "Multiple-choice practice questions for aircraft type ratings and class ratings, with study and timed exam modes.",
      url: `${base}/type-rating/${featuredAircraftCode}`,
      inLanguage: "en",
      provider: { "@type": "Organization", name: siteConfig.name, url: base },
      hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", courseWorkload: "Self-paced" },
    },
  ];
}

export default async function LandingPage() {
  const [
    { sectionsOk, typeRating, classRating, flyingKnowledge, totalSystems },
    { featuredAircraftCode },
  ] = await Promise.all([loadLandingData(), getSiteSettings()]);

  const heroStats: HeroStats | null = sectionsOk
    ? {
        totalQuestions:
          typeRating.questionCount + classRating.questionCount + flyingKnowledge.questionCount,
        totalSystems,
        totalTypes: typeRating.aircraftCount + classRating.aircraftCount,
      }
    : null;

  return (
    <div className="flex flex-col gap-16 sm:gap-24">
      <Hero stats={heroStats} />

      {/* Directly under the hero, because it is the only section on this
          page a student can actually start from: every other one explains
          the product, and this one hands them a section to pick. */}
      {sectionsOk ? (
        <SectionsOverview
          typeRating={typeRating}
          classRating={classRating}
          flyingKnowledge={flyingKnowledge}
        />
      ) : (
        <section id="whats-inside" className="scroll-mt-20">
          <DatabaseUnavailable />
        </section>
      )}

      <Trust />
      <HowItWorks />
      <Features />
      <Faq />
      <FinalCta />

      {jsonLd(featuredAircraftCode).map((entry) => (
        <script
          key={entry["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry).replace(/</g, "\\u003c") }}
        />
      ))}
    </div>
  );
}
