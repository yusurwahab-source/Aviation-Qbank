import { DatabaseUnavailable } from "@/components/database-unavailable";
import { siteConfig } from "@/config/site";
import {
  countAircraft,
  getAircraft,
  listTopics,
  type AircraftSummary,
  type TopicSummary,
} from "@/db/queries";
import { getSiteSettings } from "@/db/settings";
import { appUrl } from "@/lib/email/send";

import { AircraftSection } from "./_landing/aircraft-section";
import { Faq } from "./_landing/faq";
import { Features } from "./_landing/features";
import { FinalCta } from "./_landing/final-cta";
import type { HeroStats } from "./_landing/hero";
import { Hero } from "./_landing/hero";
import { HowItWorks } from "./_landing/how-it-works";
import { SystemsGrid } from "./_landing/systems-grid";
import { Trust } from "./_landing/trust";

/**
 * The marketing landing page.
 *
 * Everything that does not depend on the database — the hero copy, the
 * trust block, how it works, features, the FAQ, the final CTA — renders
 * unconditionally, so a database hiccup narrows the page rather than taking
 * it down. Only the two sections that show real numbers (the systems grid
 * and the aircraft card) fall back to an honest notice instead of a made-up
 * count.
 *
 * Statically rendered with an hourly revalidation, matching the brief: the
 * numbers on this page are real but do not need to be to-the-second.
 */
export const revalidate = 3600;

type LandingData = {
  /** Null on failure — a live platform fact with no honest zero to fall back to. */
  totalAircraft: number | null;
  topics: TopicSummary[];
  topicsOk: boolean;
  plane: AircraftSummary | null;
};

async function loadLandingData(featuredAircraftCode: string): Promise<LandingData> {
  const [aircraftResult, topicsResult, planeResult] = await Promise.allSettled([
    countAircraft(),
    listTopics(featuredAircraftCode),
    getAircraft(featuredAircraftCode),
  ]);

  return {
    totalAircraft: aircraftResult.status === "fulfilled" ? aircraftResult.value : null,
    topics: topicsResult.status === "fulfilled" ? topicsResult.value : [],
    topicsOk: topicsResult.status === "fulfilled",
    plane: planeResult.status === "fulfilled" ? planeResult.value : null,
  };
}

/**
 * Organization + Course JSON-LD, built from the same facts as the rest of
 * the page — no rating, review count or enrolment figure appears anywhere
 * here, because none exists to report honestly.
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
      name: `${siteConfig.name} — Boeing 737-800 type rating practice questions`,
      description:
        "Multiple-choice practice questions for the Boeing 737-800 type rating, written from FCOM and FCTM source material, with study and timed exam modes.",
      url: `${base}/aircraft/${featuredAircraftCode}`,
      inLanguage: "en",
      provider: { "@type": "Organization", name: siteConfig.name, url: base },
      hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", courseWorkload: "Self-paced" },
    },
  ];
}

export default async function LandingPage() {
  // Read before anything else the page fetches — a settings failure falls
  // back to `DEFAULT_SETTINGS.featuredAircraftCode`, so the landing page
  // never has "no featured aircraft" as a state to render.
  const { featuredAircraftCode } = await getSiteSettings();
  const { totalAircraft, topics, topicsOk, plane } = await loadLandingData(featuredAircraftCode);

  // The hero's question and system counts are the same sum the grid below
  // shows, computed once here — never a separate query that could drift
  // from it.
  const heroStats: HeroStats | null =
    topicsOk && totalAircraft !== null
      ? {
          totalQuestions: topics.reduce((sum, topic) => sum + topic.questionCount, 0),
          totalSystems: topics.length,
          totalAircraft,
        }
      : null;

  const bankAvailable = topicsOk && plane !== null && topics.length > 0;

  return (
    <div className="flex flex-col gap-16 sm:gap-24">
      <Hero stats={heroStats} featuredAircraftCode={featuredAircraftCode} />
      <Trust />

      {bankAvailable ? (
        <SystemsGrid aircraftCode={featuredAircraftCode} topics={topics} />
      ) : (
        <section id="whats-inside" className="scroll-mt-20">
          <DatabaseUnavailable />
        </section>
      )}

      <HowItWorks />
      <Features />

      {bankAvailable && plane ? (
        <AircraftSection plane={plane} systemCount={topics.length} />
      ) : (
        <DatabaseUnavailable />
      )}

      <Faq />
      <FinalCta featuredAircraftCode={featuredAircraftCode} />

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
