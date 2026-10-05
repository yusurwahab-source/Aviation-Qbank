import type { MetadataRoute } from "next";

import { canonicalUrl } from "@/lib/canonical-url";

/**
 * `robots.txt`. Nothing here is a security boundary — `/owner` is already
 * gated by `requireOwner()` and answers anyone else with a plain 404
 * (`CLAUDE.md`), and every API route only ever acts on a request it
 * recognises. This file is about crawl budget and duplicate URLs, not
 * access control:
 *
 * - the legacy redirect routes (`/aircraft`, `/class`, `/aviation-knowledge`
 *   — "Old links still work" in `CLAUDE.md`) are disallowed so a crawler only
 *   ever indexes the canonical `/type-rating`, `/class-rating` and
 *   `/flying-knowledge` URLs for the same content, never both;
 * - `/class$` and `/class/` (rather than a bare `/class`) so that disallow
 *   does not also swallow `/class-rating`, which starts with the same four
 *   letters;
 * - `/owner` and `/api/` have nothing for a search engine to index;
 * - sign-in, sign-up, `/upgrade`, `/redeem` and `/progress` all either
 *   require an account or exist only to redirect to one — none is a page
 *   worth sending a stranger to from a search result;
 * - `/tools/logbook/` (trailing slash) is one student's own logbook; the
 *   tool's landing page, `/tools/logbook`, stays crawlable.
 *
 * `sitemap.ts` is the positive list; this is only the handful of paths
 * deliberately left off it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/owner",
        "/api/",
        "/aircraft",
        "/class$",
        "/class/",
        "/aviation-knowledge",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/upgrade",
        "/redeem",
        "/progress",
        "/account",
        "/verify-email",
        "/unsubscribe",
        "/tools/logbook/",
      ],
    },
    sitemap: `${canonicalUrl()}/sitemap.xml`,
  };
}
