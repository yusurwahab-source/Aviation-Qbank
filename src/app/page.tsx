import { siteConfig } from "@/config/site";
import { listClassRatings } from "@/db/class-queries";
import { listFlyingKnowledgeSubjects } from "@/db/flying-knowledge-queries";
import { listAircraft } from "@/db/queries";
import { buildAtplRows } from "@/lib/atpl-subjects";
import { buildProductCards, type ProductCardFacts } from "@/lib/product-cards";
import { withoutHidden } from "@/lib/settings";
import { appUrl } from "@/lib/email/send";

import { ProductCards } from "./_landing/product-cards";
import { getVisibleSiteSettings } from "@/lib/settings-visibility";

/**
 * The landing page: a gateway, not a brochure. One short heading and the
 * three resource cards — EASA ATPL Ground School, Aircraft, Flight Training
 * Tools — between the shared header and footer, and nothing else. The
 * trust, how-it-works, features, FAQ and closing call-to-action sections
 * were removed in the gateway redesign; the FAQ's answers moved to `/faq`.
 *
 * The cards render whatever the database says: when it does not answer,
 * `buildProductCards` falls back to sentences with no figures rather than a
 * made-up count, so a database hiccup never takes the page down.
 *
 * Statically rendered with an hourly revalidation: the figures on the cards
 * are real but do not need to be to-the-second.
 */
export const revalidate = 3600;

async function loadCardFacts(): Promise<ProductCardFacts> {
  try {
    const settings = await getVisibleSiteSettings();
    const [fleet, classes, subjects] = await Promise.all([
      listAircraft().then((rows) => withoutHidden(settings, "type-rating", rows)),
      listClassRatings().then((rows) => withoutHidden(settings, "class-rating", rows)),
      listFlyingKnowledgeSubjects().then((rows) =>
        withoutHidden(settings, "flying-knowledge", rows),
      ),
    ]);

    return {
      liveAtplSubjects: buildAtplRows(subjects).filter((row) => row.live !== null).length,
      aircraftCount: [...fleet, ...classes].filter(isReady).length,
    };
  } catch {
    return { liveAtplSubjects: null, aircraftCount: null };
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
  const [facts, { featuredAircraftCode, hiddenSections, sectionLabels }] = await Promise.all([
    loadCardFacts(),
    getVisibleSiteSettings(),
  ]);

  const cards = buildProductCards({ hiddenSections, sectionLabels }, facts);

  return (
    <div className="flex flex-col gap-8 pt-4 sm:gap-10 sm:pt-10">
      <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        What are you studying today?
      </h1>
      <ProductCards cards={cards} />

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
