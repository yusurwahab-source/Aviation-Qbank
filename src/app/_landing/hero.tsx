import Link from "next/link";

import { TryFreeButton } from "./try-free-button";

/**
 * A plain, welcoming opening: one headline, one sentence, one primary action
 * ("Try free questions", straight into a free ATPL test) and a quieter way to
 * create an account. The three product cards follow directly below as their
 * own section, so the hero no longer carries artwork or cards of its own —
 * the 2026-10-25 brief asks for quality through spacing and type, not
 * decoration.
 *
 * Nothing here reads the database, so a database hiccup can never take the
 * opening of the page down with it; `tryHref` is simply null then and the
 * sign-up link stands alone.
 */
export function Hero({ tryHref }: { tryHref: string | null }) {
  return (
    <section className="mx-auto max-w-3xl px-1 pt-6 text-center sm:pt-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-[2.75rem] lg:leading-[1.1]">
        Walk into your exam knowing the aircraft, not just the questions
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
        ATPL theory, aircraft systems and procedure trainers in one place — with an explanation for
        every question and a timed mock exam when you are ready. No account needed to start.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <TryFreeButton href={tryHref} />
        <Link
          href="/signup"
          className="tap-target inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface px-6 text-base font-semibold text-foreground transition hover:border-brand sm:w-auto"
        >
          Create a free account
        </Link>
      </div>
    </section>
  );
}
