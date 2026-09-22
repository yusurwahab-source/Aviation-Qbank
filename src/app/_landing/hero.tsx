import { HeroBackground } from "./hero-background";
import { SectionLinks } from "./section-links";

export type HeroStats = {
  totalQuestions: number;
  totalSystems: number;
  /** Aircraft and class ratings together — a platform-wide fact, not one
   * tree's own count. See `loadLandingData` in `page.tsx`. */
  totalTypes: number;
};

const NUMBER_FORMAT = new Intl.NumberFormat("en-GB");

/**
 * The stat strip is built from whatever `getLandingStats` actually returned.
 * A database hiccup at request or build time must not take the hero down
 * with it — `stats` is null in that case, and the strip is simply skipped
 * rather than showing a made-up number or an error banner on the page meant
 * to make a first impression.
 *
 * There is no featured aircraft here any more, and no single "start
 * practising" button pointed at one. The product is three sections — type
 * rating, class rating, aviation knowledge — and the hero asks which one a
 * visitor is here for, through `SectionLinks`, rather than assuming.
 */
export function Hero({ stats }: { stats: HeroStats | null }) {
  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface px-5 py-14 sm:px-10 sm:py-20">
      <HeroBackground />

      <div className="relative mx-auto max-w-3xl text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-[2.75rem] lg:leading-[1.1]">
          Walk into your exam knowing the aircraft, not just the questions
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
          Study system by system with an explanation for every question, then sit a timed mock
          exam before the real one does. Pick the section you&rsquo;re studying for.
        </p>

        <div className="mt-8">
          <SectionLinks />
        </div>

        {stats ? (
          <dl className="mx-auto mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
            <div>
              <dt className="text-xs text-muted-foreground">Practice questions</dt>
              <dd className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
                {NUMBER_FORMAT.format(stats.totalQuestions)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Systems covered</dt>
              <dd className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
                {NUMBER_FORMAT.format(stats.totalSystems)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Aircraft in the bank</dt>
              <dd className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
                {NUMBER_FORMAT.format(stats.totalTypes)}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </section>
  );
}
