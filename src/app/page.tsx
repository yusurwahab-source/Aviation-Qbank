import { siteConfig } from "@/config/site";
import { listClassRatings } from "@/db/class-queries";
import { listFlyingKnowledgeSubjects } from "@/db/flying-knowledge-queries";
import { listAircraft } from "@/db/queries";
import { buildAtplRows } from "@/lib/atpl-subjects";
import { summariseSection, type SectionCounts } from "@/lib/section-counts";
import { buildFlyingKnowledgeTestHref } from "@/lib/test-options";
import { withoutHidden } from "@/lib/settings";
import { appUrl } from "@/lib/email/send";

import { Faq } from "./_landing/faq";
import { Features } from "./_landing/features";
import { FinalCta } from "./_landing/final-cta";
import { Hero } from "./_landing/hero";
import { HowItWorks } from "./_landing/how-it-works";
import type { PillarsData } from "./_landing/pillar-cards";
import { Trust } from "./_landing/trust";
import { TryStrip } from "./_landing/try-strip";
import { getVisibleSiteSettings } from "@/lib/settings-visibility";

/**
 * The marketing landing page.
 *
 * Everything that does not depend on the database — the hero's headline,
 * the trust block, how it works, features, the FAQ, the final CTA —
 * renders unconditionally, so a database hiccup narrows the page rather
 * than taking it down. Only the hero's card row, which shows real figures,
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
  atplRows: PillarsData["atplRows"];
  typeCodes: string[];
  classCodes: string[];
  /** Where "Try free questions" goes: the first active, visible Flying
   * Knowledge subject, because that section is free in full — no preview
   * allowance to run out of mid-test. Null when there is none. */
  tryHref: string | null;
};

/**
 * Sums real counts across both content trees — aircraft (type ratings) and
 * class ratings — rather than reading one featured aircraft's own numbers,
 * which is what this page did before it was three sections instead of one.
 */
async function loadLandingData(): Promise<LandingData> {
  try {
    const settings = await getVisibleSiteSettings();
    const [fleet, classes, subjects] = await Promise.all([
      listAircraft().then((rows) =>
        withoutHidden(settings, "type-rating", rows),
      ),
      listClassRatings().then((rows) =>
        withoutHidden(settings, "class-rating", rows),
      ),
      listFlyingKnowledgeSubjects().then((rows) =>
        withoutHidden(settings, "flying-knowledge", rows),
      ),
    ]);

    const typeRating = summariseSection(fleet);
    const classRating = summariseSection(classes);
    const flyingKnowledge = summariseSection(subjects);

    const trySubject = subjects.find(
      (subject) => subject.status === "active" && subject.publishedQuestions > 0,
    );

    return {
      sectionsOk: true,
      tryHref: trySubject
        ? buildFlyingKnowledgeTestHref(trySubject.code, { length: 10 })
        : null,
      typeRating,
      classRating,
      flyingKnowledge,
      atplRows: buildAtplRows(subjects),
      typeCodes: fleet.filter(isReady).map((plane) => plane.code),
      classCodes: classes.filter(isReady).map((ratingClass) => ratingClass.code),
    };
  } catch {
    const empty: SectionCounts = { aircraftCount: 0, questionCount: 0 };
    return {
      sectionsOk: false,
      typeRating: empty,
      classRating: empty,
      flyingKnowledge: empty,
      atplRows: [],
      typeCodes: [],
      classCodes: [],
      tryHref: null,
    };
  }
}

function isReady(row: { status: string; publishedQuestions: number }): boolean {
  return row.status === "active" && row.publishedQuestions > 0;
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
function jsonLd(
  featuredAircraftCode: string,
): { "@type": string; [key: string]: unknown }[] {
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
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "online",
        courseWorkload: "Self-paced",
      },
    },
  ];
}

export default async function LandingPage() {
  const [
    { sectionsOk, typeRating, classRating, atplRows, typeCodes, classCodes, tryHref },
    { featuredAircraftCode, hiddenSections, sectionLabels },
  ] = await Promise.all([loadLandingData(), getVisibleSiteSettings()]);

  const pillars: PillarsData | null = sectionsOk
    ? { typeRating, classRating, atplRows, typeCodes, classCodes }
    : null;

  return (
    <div className="font-reading flex flex-col gap-16 sm:gap-24">
      <Hero pillars={pillars} settings={{ hiddenSections, sectionLabels }} />
      <Trust />
      <HowItWorks />
      <TryStrip tryHref={tryHref} />
      <Features />
      <Faq />
      <FinalCta tryHref={tryHref} />

      {jsonLd(featuredAircraftCode).map((entry) => (
        <script
          key={entry["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(entry).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </div>
  );
}
