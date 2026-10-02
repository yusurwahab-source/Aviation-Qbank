import type { MetadataRoute } from "next";

/**
 * The shape every content-tree summary already has — `AircraftSummary`,
 * `ClassRatingSummary` and `FlyingKnowledgeSubjectSummary` all satisfy this
 * without a cast, so the caller passes what `listAircraft`,
 * `listClassRatings` and `listFlyingKnowledgeSubjects` already return.
 */
type PublishableSection = { code: string; status: "active" | "coming_soon" };

/**
 * The marketing and picker pages that exist regardless of what content is
 * loaded — the three section pickers plus the short footer-linked pages.
 * Legacy redirects (`/aircraft`, `/class`, `/aviation-knowledge`), owner-only
 * and account-only pages (`/owner`, `/progress`, `/upgrade`, `/redeem`,
 * sign-in and sign-up) are deliberately absent: none of them is a page
 * Google should send a stranger to, which `robots.ts` states for the ones
 * worth disallowing outright.
 */
const STATIC_PAGES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/type-rating", changeFrequency: "weekly", priority: 0.9 },
  { path: "/class-rating", changeFrequency: "weekly", priority: 0.9 },
  { path: "/flying-knowledge", changeFrequency: "weekly", priority: 0.9 },
  { path: "/pilot-sims", changeFrequency: "monthly", priority: 0.7 },
  {
    path: "/pilot-sims/holding-pattern-entry-trainer",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/pilot-sims/vor-ndb-trainer",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.6 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
] as const satisfies readonly {
  path: string;
  changeFrequency: NonNullable<
    MetadataRoute.Sitemap[number]["changeFrequency"]
  >;
  priority: number;
}[];

/** One picker's URL prefix and the rows behind it, kept together so the
 * three trees can be walked identically below. */
type Section = {
  prefix: "type-rating" | "class-rating" | "flying-knowledge";
  rows: PublishableSection[];
};

/**
 * Builds every publicly indexable URL, from the same facts the pages
 * themselves are built from.
 *
 * Pure and tested, the same reasoning `access-policy.ts` and `settings.ts`
 * give their own decisions: the one rule worth getting wrong-proof here is
 * that a "coming soon" aircraft, class rating or Flying Knowledge subject
 * never gets a URL — the sitemap equivalent of "only `published` questions
 * are ever shown to a user" (`CLAUDE.md`). A coming-soon row has no test to
 * sit and nothing but a placeholder to show, so sending Google there would
 * be indexing a dead end.
 *
 * Codes are used exactly as the database stores them (`B737`, `DA40`),
 * uppercase — the same string every in-app link to that page already uses
 * (`type-rating/page.tsx`, `flying-knowledge/page.tsx`, …). A lowercased URL
 * would still resolve, since the lookup itself is case-insensitive, but it
 * would be a second address for the same page that nothing in the app ever
 * links to, which is exactly the kind of duplicate-URL confusion a sitemap
 * exists to avoid.
 */
export function buildSitemapEntries(
  baseUrl: string,
  sections: {
    aircraft: PublishableSection[];
    classRatings: PublishableSection[];
    flyingKnowledgeSubjects: PublishableSection[];
  },
  hiddenSections: readonly string[] = [],
): MetadataRoute.Sitemap {
  const isHidden = (path: string) =>
    hiddenSections.some(
      (key) => path === `/${key}` || path.startsWith(`/${key}/`),
    );
  const origin = baseUrl.replace(/\/+$/, "");

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.filter(
    ({ path }) => !isHidden(path),
  ).map(({ path, changeFrequency, priority }) => ({
    url: `${origin}${path}`,
    changeFrequency,
    priority,
  }));

  const trees: Section[] = [
    { prefix: "type-rating", rows: sections.aircraft },
    { prefix: "class-rating", rows: sections.classRatings },
    { prefix: "flying-knowledge", rows: sections.flyingKnowledgeSubjects },
  ];

  const detailEntries: MetadataRoute.Sitemap = trees.flatMap(
    ({ prefix, rows }) =>
      isHidden(`/${prefix}`)
        ? []
        : rows
            .filter((row) => row.status === "active")
            .map((row) => ({
              url: `${origin}/${prefix}/${row.code}`,
              changeFrequency: "weekly",
              priority: 0.8,
            })),
  );

  return [...staticEntries, ...detailEntries];
}
