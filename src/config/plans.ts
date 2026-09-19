/**
 * The free/premium tier, in one place.
 *
 * Static data only — like `site.ts`, no environment reads and no
 * `server-only` import, so both server and client components can read it
 * directly rather than asking a server action what today's limit is.
 * `src/lib/billing/plan-access.ts` is the pure logic that turns this
 * configuration plus a user's row into "may they do this" — this file is
 * only the numbers and names an owner might actually want to change.
 *
 * This is deliberately a second, simpler tier system alongside the
 * recurring Stripe subscription from Phase 6 (`subscriptions`,
 * `FREE_QUESTIONS_PER_AIRCRAFT` in `access-policy.ts`, still live and
 * unchanged). That one meters *how many distinct questions* a student may
 * answer, aircraft by aircraft, and keeps working exactly as before. This
 * one gates *which systems, how long a test, and which features* — the
 * shape the commercialisation pass asked for — and a user counts as
 * premium under this system if either grants it; see `isPremiumUser`.
 */

export const PLANS = ["free", "premium"] as const;
export type Plan = (typeof PLANS)[number];

export type PlanLimits = {
  /** `null` means no cap. */
  maxQuestionsPerTest: number | null;
  examModeAllowed: boolean;
  /**
   * The test builder's quick-start presets that are built from a student's
   * own history — "My weak systems", "Questions I got wrong", "My flagged
   * questions", "Unseen questions". Manually ticking sections is always
   * allowed; this is only the shortcuts that pick the sections for you.
   */
  smartTestAllowed: boolean;
};

/**
 * The free tier's caps. Change the numbers here to change the product,
 * with no other file to touch — `maxQuestionsPerTest` bounds `?questions=`
 * the same way the free-question allowance already bounds it, `PremiumGate`
 * and the server-side guard in `lib/billing/plan-access.ts` both read
 * `examModeAllowed` and `smartTestAllowed` from here rather than hardcoding
 * either.
 */
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxQuestionsPerTest: 20,
    examModeAllowed: false,
    smartTestAllowed: false,
  },
  premium: {
    maxQuestionsPerTest: null,
    examModeAllowed: true,
    smartTestAllowed: true,
  },
};

/**
 * Which sections a free account has full, ungated access to, by aircraft
 * code. An aircraft with no entry here is fully free — every section open
 * to everyone — which is what keeps the DA40's existing behaviour
 * unchanged: this is a new restriction layered on top for the aircraft the
 * owner names, not a rule every aircraft now carries.
 *
 * A section not in this list still appears in the builder for a free
 * account — as a locked card naming its question count, never hidden
 * outright, so nobody free is shown a shorter aircraft than it actually
 * is — but cannot be selected or drawn from. `canAccessSystem` in
 * `plan-access.ts` is the one place that reads this.
 */
export const FREE_SYSTEMS: Record<string, readonly string[]> = {
  B737: ["Airplane General", "Electrical", "Fuel"],
};

export type PricingTierId = "quarterly" | "annual" | "lifetime";

export type PricingTier = {
  id: PricingTierId;
  name: string;
  /** Whole months of access, or `null` for lifetime. */
  months: number | null;
  /** Price in whole cents, one-time. Edit these three numbers to change
   * what the pricing page shows — nothing else on that page needs editing
   * to reflect a price change. */
  priceCents: number;
  /** The currency the price above is denominated in, ISO 4217. */
  currency: string;
  mostPopular: boolean;
  blurb: string;
};

/**
 * The three one-time tiers `/pricing` shows.
 *
 * One-time payments, not the recurring monthly/quarterly Stripe
 * subscription `/upgrade` already sells — see the note at the top of this
 * file. Checkout is not wired up to these yet: the buy button on each card
 * opens the early-access form instead of a payment page. Edit the prices
 * here when they are decided; nothing else needs to change.
 */
export const PRICING_TIERS: readonly PricingTier[] = [
  {
    id: "quarterly",
    name: "3 months",
    months: 3,
    priceCents: 2900,
    currency: "USD",
    mostPopular: false,
    blurb: "Enough for one focused run at a type rating.",
  },
  {
    id: "annual",
    name: "12 months",
    months: 12,
    priceCents: 7900,
    currency: "USD",
    mostPopular: true,
    blurb: "A full year across every aircraft, recurrency included.",
  },
  {
    id: "lifetime",
    name: "Lifetime",
    months: null,
    priceCents: 14900,
    currency: "USD",
    mostPopular: false,
    blurb: "Pay once. Every aircraft this bank ever adds, for good.",
  },
];

/** `$29` from `2900`, or `$29.50` when the price is not a whole dollar —
 * a pricing page showing ".00" on every card reads as an invoice, not a
 * price. */
export function formatPrice(priceCents: number, currency: string): string {
  const amount = priceCents / 100;
  const hasCents = !Number.isInteger(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(amount);
}
