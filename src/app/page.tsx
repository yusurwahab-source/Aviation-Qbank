import { siteConfig } from "@/config/site";
import { listFlyingKnowledgeSubjects } from "@/db/flying-knowledge-queries";
import { atplQuestionCount, buildAtplRows } from "@/lib/atpl-subjects";
import { buildProductCards, type ProductCardFacts } from "@/lib/product-cards";
import { withoutHidden } from "@/lib/settings";
import { appUrl } from "@/lib/email/send";

import { Hero } from "./_landing/hero";
import { LatestArticles } from "./_landing/latest-articles";
import { ProductCards } from "./_landing/product-cards";
import { getVisibleSiteSettings } from "@/lib/settings-visibility";

/**
 * The landing page, and nothing on it but what leads somewhere: a shallow
 * hero ("Your Aviation Study Hub"), the three resource cards — EASA ATPL
 * Ground School, Aircraft, Flight Training Tools — and the three latest
 * Articles, between the shared header and footer. The old trust,
 * how-it-works, features, FAQ and closing call-to-action sections are gone
 * from here; the FAQ's answers live at `/faq`.
 *
 * The ATPL card's question count is read from the same rows the ATPL page
 * lists, so it is only ever a figure a student could sit. When the database
 * does not answer, the card shows no figure rather than a made-up one, and
 * the articles section leaves itself out, so a database hiccup never takes
 * the page down.
 *
 * Statically rendered with an hourly revalidation; publishing a post also
 * revalidates `/` straight away (`owner/content/actions.ts`).
 */
export const revalidate = 3600;

async function loadCardFacts(): Promise<ProductCardFacts> {
  try {
    const settings = await getVisibleSiteSettings();
    const subjects = withoutHidden(settings, "flying-knowledge", await listFlyingKnowledgeSubjects());
    return { atplQuestionCount: atplQuestionCount(buildAtplRows(subjects)) };
  } catch {
    return { atplQuestionCount: null };
  }
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
    <div className="flex flex-col">
      {/* Edge to edge and under the header; everything after it sits in the
          page's usual column, which `main` gives up on this page only. */}
      <Hero questionCount={facts.atplQuestionCount} />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-6 sm:gap-6 sm:px-5 sm:pt-8">
        <ProductCards cards={cards} />
        <div className="mt-6 sm:mt-8">
          <LatestArticles />
        </div>
      </div>

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
