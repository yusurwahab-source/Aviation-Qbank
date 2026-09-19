import Link from "next/link";

import { FEATURED_AIRCRAFT_CODE } from "@/config/aircraft-marketing";

import { HeroBackground } from "./hero-background";

export type HeroStats = {
  totalQuestions: number;
  totalSystems: number;
  totalAircraft: number;
};

const NUMBER_FORMAT = new Intl.NumberFormat("en-GB");

/**
 * The stat strip is built from whatever `getLandingStats` actually returned.
 * A database hiccup at request or build time must not take the hero down
 * with it — `stats` is null in that case, and the strip is simply skipped
 * rather than showing a made-up number or an error banner on the page meant
 * to make a first impression.
 */
export function Hero({ stats }: { stats: HeroStats | null }) {
  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface px-5 py-14 sm:px-10 sm:py-20">
      <HeroBackground />

      <div className="relative mx-auto max-w-3xl text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-[2.75rem] lg:leading-[1.1]">
          Walk into your type rating technical exam knowing the aircraft
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
          Study the 737&ndash;800 system by system with an explanation for every question, then
          sit a timed mock exam before the real one does.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={`/aircraft/${FEATURED_AIRCRAFT_CODE}`}
            className="tap-target inline-flex w-full items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-on-solid transition hover:bg-brand-strong sm:w-auto"
          >
            Start practising free
          </Link>
          <a
            href="#whats-inside"
            className="tap-target inline-flex w-full items-center justify-center rounded-lg border border-border px-6 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand sm:w-auto"
          >
            See what&rsquo;s inside
          </a>
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
                {NUMBER_FORMAT.format(stats.totalAircraft)}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </section>
  );
}
