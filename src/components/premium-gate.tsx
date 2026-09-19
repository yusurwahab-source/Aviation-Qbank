import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Locked content, shown rather than hidden.
 *
 * `isPremium` is always computed server-side, from `isPremiumUser` in
 * `lib/billing/plan-access.ts` — this component only decides what to
 * render with that answer, and is never itself the thing standing between
 * a free account and a premium feature. That boundary is
 * `resolveAllowedTopics`/`capQuestionCount`/`examModeAllowed` at the point
 * a test is actually built, in `test/page.tsx`; a component can be skipped
 * by anyone who can read a URL, so nothing here is trusted to enforce
 * anything on its own.
 *
 * The locked state is a real rendering of what is missing, not a blank
 * space: "the whole point is that a free user can see what they are
 * missing" is precisely why this takes `children` for the unlocked case
 * and a description for the locked one, rather than being a boolean
 * show/hide.
 */
export function PremiumGate({
  isPremium,
  children,
  title = "Premium",
  description = "Subscribe to unlock this.",
  compact = false,
}: {
  isPremium: boolean;
  children: ReactNode;
  title?: string;
  description?: string;
  /** A smaller, inline rendering for a locked item inside a list — a
   * section card or a preset chip — rather than the full panel used for a
   * whole gated feature. */
  compact?: boolean;
}) {
  if (isPremium) return <>{children}</>;

  if (compact) {
    return (
      <div
        aria-disabled="true"
        className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-surface-muted px-4 py-3 text-muted-foreground"
      >
        <LockIcon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 text-sm">{description}</span>
        <Link
          href="/pricing"
          className="tap-target shrink-0 text-xs font-semibold text-brand hover:underline"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-muted p-5 text-center">
      <LockIcon className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <Link
        href="/pricing"
        className="tap-target mt-3 inline-flex items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
      >
        See plans
      </Link>
    </div>
  );
}

export function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
