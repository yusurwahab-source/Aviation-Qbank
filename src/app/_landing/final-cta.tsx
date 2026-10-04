import Link from "next/link";

import { TryFreeButton } from "./try-free-button";

export function FinalCta({ tryHref }: { tryHref: string | null }) {
  return (
    <section className="rounded-2xl border border-border bg-surface-elevated px-5 py-12 text-center sm:px-10">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Start on the systems, finish on the exam
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
        Free to start, no card required. Answer a few questions and see how it goes.
      </p>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <TryFreeButton href={tryHref} />
        <Link
          href="/signup"
          className="tap-target inline-flex w-full items-center justify-center rounded-lg border border-border px-6 text-center text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand-ink sm:w-auto"
        >
          Create a free account
        </Link>
      </div>

      <p className="mx-auto mt-8 max-w-xl text-xs text-subtle-foreground">
        Not affiliated with or endorsed by The Boeing Company. &ldquo;737&rdquo; and
        &ldquo;Boeing&rdquo; are trademarks of their respective owners, used here for
        identification and educational purposes only.
      </p>
    </section>
  );
}
