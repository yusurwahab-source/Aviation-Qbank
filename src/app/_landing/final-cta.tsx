import Link from "next/link";

import { FEATURED_AIRCRAFT_CODE } from "@/config/aircraft-marketing";

export function FinalCta() {
  return (
    <section className="rounded-2xl border border-border bg-surface-elevated px-5 py-12 text-center sm:px-10">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Start on the systems, finish on the exam
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
        Free to start, no card required. Pick a system and see how it goes.
      </p>

      <Link
        href={`/aircraft/${FEATURED_AIRCRAFT_CODE}`}
        className="tap-target mt-6 inline-flex items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
      >
        Start practising free
      </Link>

      <p className="mx-auto mt-8 max-w-xl text-xs text-subtle-foreground">
        Not affiliated with or endorsed by The Boeing Company. &ldquo;737&rdquo; and
        &ldquo;Boeing&rdquo; are trademarks of their respective owners, used here for
        identification and educational purposes only.
      </p>
    </section>
  );
}
