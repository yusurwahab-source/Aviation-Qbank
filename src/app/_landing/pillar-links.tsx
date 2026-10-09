import Link from "next/link";

import { getSiteSettings } from "@/db/settings";
import {
  isPillarHidden,
  PILLAR_HREFS,
  PILLAR_KEYS,
  pillarShortTitle,
} from "@/lib/pillars";

/**
 * The three ways into the product, as a row of equal-weight buttons.
 *
 * All three are outlined and identical — none is the "primary" one. The
 * yellow button on the landing page is `TryFreeButton`, which starts a test;
 * these are for a visitor who already knows which pillar they want. Names
 * are the short ones (see `pillarShortTitle`); the full title is the
 * destination page's own heading.
 */
export async function PillarLinks({ className = "" }: { className?: string }) {
  const settings = await getSiteSettings();

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 sm:flex-row ${className}`}
    >
      {PILLAR_KEYS.filter((pillar) => !isPillarHidden(settings, pillar)).map((pillar) => (
        <Link
          key={pillar}
          href={PILLAR_HREFS[pillar]}
          className="tap-target inline-flex w-full items-center justify-center rounded-lg border border-border px-6 text-center text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand-ink sm:w-auto"
        >
          {pillarShortTitle(settings, pillar)}
        </Link>
      ))}
    </div>
  );
}
