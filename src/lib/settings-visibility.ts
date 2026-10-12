import "server-only";

import { getSiteSettings } from "@/db/settings";
import { isOwner } from "@/lib/auth/owner";
import { getCurrentUser } from "@/lib/auth/session";
import { envValue } from "@/lib/env";
import { unhidden, type SiteSettings } from "@/lib/settings";

/**
 * The settings as the person looking at the page should see them.
 *
 * Hiding a section or an item in `/owner/settings` takes it away from
 * students, visitors and search engines. The owner still sees it, as normal,
 * so they can check what they have changed. Pages and layouts that decide
 * what to show read this; the owner's own settings screen, the sitemap and
 * the test-taking actions keep reading `getSiteSettings()` unchanged.
 */
export async function getVisibleSiteSettings(): Promise<SiteSettings> {
  const settings = await getSiteSettings();
  let owner = false;
  try {
    const user = await getCurrentUser();
    owner = user !== null && isOwner(user.email, envValue("OWNER_EMAIL"));
  } catch {
    owner = false;
  }
  return owner ? unhidden(settings) : settings;
}
