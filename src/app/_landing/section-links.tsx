import Link from "next/link";

import { getSiteSettings } from "@/db/settings";
import { isSectionHidden } from "@/lib/settings";

/**
 * The three ways into the product, as a row of equal-weight buttons.
 *
 * Used by both `Hero` and `FinalCta` — written once so the two can never
 * describe the three sections differently. Neither picks a "primary" one:
 * the product is three sections, not one section with two afterthoughts, so
 * a visitor is asked which they are here for rather than pointed at
 * whichever aircraft happens to be featured this week.
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
          className="tap-target inline-flex w-full items-center justify-center rounded-lg bg-brand px-6 text-center text-sm font-semibold text-on-solid transition hover:bg-brand-strong sm:w-auto"
        >
          Type Rating Systems Knowledge
        </Link>
      )}
      {isSectionHidden(settings, "class-rating") ? null : (
        <Link
          href="/class-rating"
          className="tap-target inline-flex w-full items-center justify-center rounded-lg border border-border px-6 text-center text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand sm:w-auto"
        >
          Class Rating Systems Knowledge
        </Link>
      )}
      {isSectionHidden(settings, "flying-knowledge") ? null : (
        <Link
          href="/flying-knowledge"
          className="tap-target inline-flex w-full items-center justify-center rounded-lg border border-border px-6 text-center text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand sm:w-auto"
        >
          Flying Knowledge
        </Link>
      )}
    </div>
  );
}
