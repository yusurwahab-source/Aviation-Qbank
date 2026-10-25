import type { MetadataRoute } from "next";

import { listClassRatings } from "@/db/class-queries";
import { listFlyingKnowledgeSubjects } from "@/db/flying-knowledge-queries";
import { listAircraft } from "@/db/queries";
import { getSiteSettings } from "@/db/settings";
import { canonicalUrl } from "@/lib/canonical-url";
import { withoutHidden } from "@/lib/settings";
import { listPostsForSitemap } from "@/db/posts";
import { buildPostSitemapEntries, buildSitemapEntries } from "@/lib/seo/sitemap-entries";

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
import { loadContent } from "@/content/load";
import { loadClassContent } from "@/content/load-classes";
import { loadFlyingKnowledgeContent } from "@/content/load-flying-knowledge";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let aircraft: { code: string; status: "active" | "coming_soon" }[] = [];
  let classRatings: { code: string; status: "active" | "coming_soon" }[] = [];
  let flyingKnowledgeSubjects: { code: string; status: "active" | "coming_soon" }[] = [];
  let hiddenSections: string[] = [];

  try {
    const [dbAircraft, dbClasses, dbSubjects, settings] = await Promise.all([
      listAircraft(),
      listClassRatings(),
      listFlyingKnowledgeSubjects(),
      getSiteSettings(),
    ]);
    aircraft = withoutHidden(settings, "type-rating", dbAircraft);
    classRatings = withoutHidden(settings, "class-rating", dbClasses);
    flyingKnowledgeSubjects = withoutHidden(settings, "flying-knowledge", dbSubjects);
    hiddenSections = [...settings.hiddenSections];
  } catch {
    // Fall back to on-disk content manifests if the database is not reached during build
    try {
      const { aircraft: diskAircraft } = loadContent();
      const { classes: diskClasses } = loadClassContent();
      const { subjects: diskSubjects } = loadFlyingKnowledgeContent();

      aircraft = diskAircraft.map((a) => ({
        code: a.manifest.code,
        status: a.manifest.status,
      }));
      classRatings = diskClasses.map((c) => ({
        code: c.manifest.code,
        status: c.manifest.status,
      }));
      flyingKnowledgeSubjects = diskSubjects.map((s) => ({
        code: s.manifest.code,
        status: s.manifest.status,
      }));
    } catch {
      // Keep empty if content also fails
    }
  }

  // Published Blog posts and Articles. A failure here leaves them out of
  // this build's sitemap rather than failing the whole file.
  let postRows: Awaited<ReturnType<typeof listPostsForSitemap>> = [];
  try {
    postRows = await listPostsForSitemap();
  } catch {
    postRows = [];
  }

  return [
    ...buildSitemapEntries(
      canonicalUrl(),
      {
        aircraft,
        classRatings,
        flyingKnowledgeSubjects,
      },
      hiddenSections,
    ),
    ...buildPostSitemapEntries(canonicalUrl(), postRows),
  ];
}
