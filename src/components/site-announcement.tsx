import { getSiteSettings } from "@/db/settings";

/**
 * One line the owner can put above every page, without a deploy.
 *
 * Reads through `getSiteSettings`, which already falls back to "no
 * announcement" on any database trouble — so this can sit in the shell
 * next to `SiteHeader` and fail exactly the same way: quietly, by simply
 * not rendering, never by taking the page down.
 */
export async function SiteAnnouncement() {
  const { announcement } = await getSiteSettings();
  if (announcement === "") return null;

  return (
    <div className="border-b border-border bg-flag-soft">
      <p className="mx-auto w-full max-w-5xl px-4 py-2 text-center text-sm font-medium text-flag sm:px-5">
        {announcement}
      </p>
    </div>
  );
}
