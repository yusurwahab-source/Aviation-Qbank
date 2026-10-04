import Link from "next/link";

import { getSiteSettings } from "@/db/settings";
import { isSectionHidden, sectionShortTitle } from "@/lib/settings";

/**
 * The three ways into the product, as a row of equal-weight buttons.
 *
 * All three are outlined and identical — none is the "primary" one, since
 * the product is three sections, not one section with two afterthoughts.
 * The yellow button on the landing page is `TryFreeButton`, which starts a
 * test; these are for a visitor who already knows which section they want.
 * Names are the short ones (see `sectionShortTitle`); the full title is the
 * destination page's own heading.
 */
export async function SectionLinks({ className = "" }: { className?: string }) {
  const settings = await getSiteSettings();

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 sm:flex-row ${className}`}
    >
      {isSectionHidden(settings, "type-rating") ? null : (
        <Link
          href="/type-rating"
          className="tap-target inline-flex w-full items-center justify-center rounded-lg border border-border px-6 text-center text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand-ink sm:w-auto"
        >
          {sectionShortTitle(settings, "type-rating")}
        </Link>
      )}
      {isSectionHidden(settings, "class-rating") ? null : (
        <Link
          href="/class-rating"
          className="tap-target inline-flex w-full items-center justify-center rounded-lg border border-border px-6 text-center text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand-ink sm:w-auto"
        >
          {sectionShortTitle(settings, "class-rating")}
        </Link>
      )}
      {isSectionHidden(settings, "flying-knowledge") ? null : (
        <Link
          href="/flying-knowledge"
          className="tap-target inline-flex w-full items-center justify-center rounded-lg border border-border px-6 text-center text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand-ink sm:w-auto"
        >
          {sectionShortTitle(settings, "flying-knowledge")}
        </Link>
      )}
    </div>
  );
}
