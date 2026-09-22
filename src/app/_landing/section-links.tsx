import Link from "next/link";

/**
 * The three ways into the product, as a row of equal-weight buttons.
 *
 * Used by both `Hero` and `FinalCta` — written once so the two can never
 * describe the three sections differently. Neither picks a "primary" one:
 * the product is three sections, not one section with two afterthoughts, so
 * a visitor is asked which they are here for rather than pointed at
 * whichever aircraft happens to be featured this week.
 */
export function SectionLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 sm:flex-row ${className}`}>
      <Link
        href="/type-rating"
        className="tap-target inline-flex w-full items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-on-solid transition hover:bg-brand-strong sm:w-auto"
      >
        Type rating
      </Link>
      <Link
        href="/class-rating"
        className="tap-target inline-flex w-full items-center justify-center rounded-lg border border-border px-6 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand sm:w-auto"
      >
        Class rating
      </Link>
      <Link
        href="/aviation-knowledge"
        className="tap-target inline-flex w-full items-center justify-center rounded-lg border border-border px-6 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand sm:w-auto"
      >
        Aviation knowledge
      </Link>
    </div>
  );
}
