import { TurbofanSimulator } from "./turbofan-simulator";

/**
 * The page's hero: a navy panel with the engine simulator centred in it. The
 * panel is the same fixed-dark surface the homepage hero uses, so it reads
 * the same in either theme.
 */
export function AircraftSystemsHero() {
  return (
    <section
      aria-labelledby="aircraft-systems-title"
      className="relative mb-8 overflow-hidden rounded-2xl bg-[linear-gradient(180deg,var(--hero-scrim),var(--sim-panel))] px-4 py-8 text-on-hero sm:px-8 sm:py-12"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/3 bg-[radial-gradient(ellipse_at_50%_100%,color-mix(in_oklab,var(--hero-accent)_26%,transparent),transparent_70%)]"
      />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-hero-accent">
            Aircraft
          </p>
          <h1
            id="aircraft-systems-title"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Understand the engine, not just the answer
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-sim-muted">
            Move the thrust lever and watch air and heat move through every stage of a turbofan.
          </p>
        </div>
        <div className="w-full text-left">
          <TurbofanSimulator />
        </div>
      </div>
    </section>
  );
}
