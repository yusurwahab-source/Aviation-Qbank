import "server-only";

import { siteConfig } from "@/config/site";
import { appUrl } from "@/lib/email/send";

/**
 * This deployment's own canonical address, safe to publish to a crawler or a
 * `<link rel="canonical">` tag.
 *
 * `appUrl()` already knows how to find this deployment — an explicit
 * `APP_URL`, then Vercel's production domain, then localhost — and is reused
 * here rather than duplicated, so the canonical URL, the sitemap, robots.txt
 * and the links in emails can never disagree about where this site is.
 *
 * Its last resort is localhost, which is right in development and wrong
 * everywhere a real crawler might read it: a production deployment that
 * somehow cannot name itself would otherwise publish
 * `http://localhost:3000` to Google. There, `siteConfig.url` is the better
 * answer.
 */
export function canonicalUrl(): string {
  const resolved = appUrl();
  const isLocal = resolved.startsWith("http://localhost");
  return process.env.NODE_ENV === "production" && isLocal ? siteConfig.url : resolved;
}
