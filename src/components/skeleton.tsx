/**
 * Loading placeholders shaped like what they stand in for, rather than a
 * bare spinner in the middle of the page. `animate-pulse` is a Tailwind
 * utility on top of a plain `animation`, so the global
 * `prefers-reduced-motion` rule in `globals.css` — which flattens every
 * animation's duration to near-zero — already turns this into a static
 * block for anyone who has asked for less motion; nothing extra to wire up
 * here.
 *
 * `aria-hidden` throughout: a skeleton describes nothing a screen reader
 * should read out, and `role="status"`/`aria-live="polite"` on the one
 * wrapping element is what actually announces "loading" once, rather than
 * on every pulse.
 */

function Bar({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-surface-muted ${className}`} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <Bar className="h-4 w-1/3" />
      <Bar className="mt-3 h-5 w-2/3" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Bar key={index} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

/** A grid of card skeletons — the aircraft picker, a list of sections. */
export function SkeletonCardGrid({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-4 sm:grid-cols-2">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

/** A single wide panel — the test builder, a report's summary card. */
export function SkeletonPanel({ lines = 5 }: { lines?: number }) {
  return (
    <div role="status" aria-live="polite" className="rounded-xl border border-border bg-surface p-5">
      <span className="sr-only">Loading…</span>
      <Bar className="h-4 w-1/4" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, index) => (
          <Bar key={index} className={`h-9 ${index === lines - 1 ? "w-3/5" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

/** A short list of rows — a topic breakdown, a table of recent tests. */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-2">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, index) => (
        <Bar key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}
