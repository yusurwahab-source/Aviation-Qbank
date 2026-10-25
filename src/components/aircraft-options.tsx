import Link from "next/link";
import type { ReactNode } from "react";

/** The id of the question-bank section the second option jumps to. */
export const QUESTION_BANK_ANCHOR = "question-bank";

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  className: "h-6 w-6",
} as const;

/**
 * The two ways into one aircraft, side by side: its study materials (the
 * static study guide in `public/`, opened in a new tab as it always was)
 * and its systems question bank (the test builder further down the same
 * page, so resuming, presets and the free-tier figure all work exactly as
 * before). An aircraft with no study guide yet says so plainly rather than
 * linking nowhere.
 */
export function AircraftOptions({ guideHref }: { guideHref: string | null }) {
  return (
    <nav aria-label="Aircraft resources">
      <ul className="grid gap-4 sm:grid-cols-2">
        <li>
          {guideHref ? (
            <OptionCard
              href={guideHref}
              external
              title="Study Materials"
              description="The aircraft systems study guide."
              cta="Open"
              icon={
                <svg {...ICON_PROPS}>
                  <path d="M4 5.5c2.2-1 4.8-1 7 0v12.8c-2.2-1-4.8-1-7 0V5.5Z" />
                  <path d="M20 5.5c-2.2-1-4.8-1-7 0v12.8c2.2-1 4.8-1 7 0V5.5Z" />
                </svg>
              }
            />
          ) : (
            <div className="flex h-full items-center gap-4 rounded-xl border border-dashed border-border bg-surface p-5 opacity-80">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-muted-foreground">
                <svg {...ICON_PROPS}>
                  <path d="M4 5.5c2.2-1 4.8-1 7 0v12.8c-2.2-1-4.8-1-7 0V5.5Z" />
                  <path d="M20 5.5c-2.2-1-4.8-1-7 0v12.8c2.2-1 4.8-1 7 0V5.5Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Study Materials</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Not available for this aircraft yet.
                </p>
              </div>
            </div>
          )}
        </li>
        <li>
          <OptionCard
            href={`#${QUESTION_BANK_ANCHOR}`}
            title="Systems Question Bank"
            description="Build a practice test or a timed exam."
            cta="Start"
            icon={
              <svg {...ICON_PROPS}>
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            }
          />
        </li>
      </ul>
    </nav>
  );
}

function OptionCard({
  href,
  external = false,
  title,
  description,
  cta,
  icon,
}: {
  href: string;
  external?: boolean;
  title: string;
  description: string;
  cta: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group flex h-full items-center gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:border-brand hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="shrink-0 text-sm font-semibold text-brand-ink">
        {cta}
        <span
          aria-hidden="true"
          className="ml-1 inline-block transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        >
          →
        </span>
        {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </span>
    </Link>
  );
}
