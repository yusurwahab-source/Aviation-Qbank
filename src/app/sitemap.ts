import type { MetadataRoute } from "next";

import { listClassRatings } from "@/db/class-queries";
import { listFlyingKnowledgeSubjects } from "@/db/flying-knowledge-queries";
import { listAircraft } from "@/db/queries";
import { getSiteSettings } from "@/db/settings";
import { canonicalUrl } from "@/lib/canonical-url";
import { buildSitemapEntries } from "@/lib/seo/sitemap-entries";

/**
 * `sitemap.xml`, generated from the same three content trees the landing
 * page reads (`page.tsx`'s `loadLandingData`) — one aircraft, class rating
 * or Flying Knowledge subject earns a URL exactly when it is public, never
 * from a hardcoded list that content could drift out of.
 *
 * No `dynamic` export: this reads the database, but "deploying is how
 * content ships" already means a build runs with the current bank seeded
 * (`vercel-build`, `CLAUDE.md`), so generating it once at build time is the
 * same trade every other page here makes and gives a plain static file
 * instead of a per-crawler database round trip.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [aircraft, classRatings, flyingKnowledgeSubjects, settings] =
    await Promise.all([
      listAircraft(),
      listClassRatings(),
      listFlyingKnowledgeSubjects(),
      getSiteSettings(),
    ]);

  return buildSitemapEntries(
    canonicalUrl(),
    { aircraft, classRatings, flyingKnowledgeSubjects },
    settings.hiddenSections,
  );
}
