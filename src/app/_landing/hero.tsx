import { DatabaseUnavailable } from "@/components/database-unavailable";
import type { SiteSettings } from "@/lib/settings";

import { HeroBackground } from "./hero-background";
import { buildPillarCards, type PillarsData } from "./pillar-cards";

/**
 * The hero asks one question — which of the three pillars are you here
 * for? — and answers it with three large cards rather than a headline, a
 * button and a row of small text links. The old stat strip (practice
 * questions / systems covered / aircraft in the bank) is gone: three large
 * numbers next to three large cards competed for the same attention, and
 * the owner asked for the numbers to go rather than be shrunk.
 *
 * `pillars` is null exactly when `sectionsOk` is false on the loading side
 * (`page.tsx`) — a database hiccup must not take the hero down with it, so
 * the headline still renders and the card row is replaced by the same
 * honest notice the rest of the page uses.
 */
export function Hero({
  pillars,
  settings,
}: {
  pillars: PillarsData | null;
  settings: Pick<SiteSettings, "hiddenSections" | "sectionLabels">;
}) {
  const cards = pillars ? buildPillarCards(pillars, settings) : [];

  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface px-5 py-14 sm:px-10 sm:py-20">
      <HeroBackground />

      <div className="relative mx-auto max-w-3xl text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-[2.75rem] lg:leading-[1.1]">
          Walk into your exam knowing the aircraft, not just the questions
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
          Study system by system with an explanation for every question, then sit a timed mock
          exam before the real one does. No account needed to start.
        </p>
      </div>

      <div className="relative mt-10 sm:mt-12">
        {pillars === null ? (
          <div className="mx-auto max-w-md">
            <DatabaseUnavailable />
          </div>
        ) : (
          <ul
            className={`mx-auto grid max-w-5xl gap-4 ${
              cards.length === 3
                ? "md:grid-cols-3"
                : cards.length === 2
                  ? "sm:max-w-3xl md:grid-cols-2"
                  : "sm:max-w-sm"
            }`}
          >
            {cards.map(({ key, node }) => (
              <li key={key} className="h-full">
                {node}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
