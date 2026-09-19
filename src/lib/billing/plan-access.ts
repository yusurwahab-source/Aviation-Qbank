/**
 * Who gets the free tier's caps, and who gets past them.
 *
 * Pure, like `access-policy.ts` beside it: no database, only the facts a
 * caller already looked up. That is what makes "may this student do X" a
 * single testable rule rather than something re-derived at every call site
 * — and what makes a server-side guard possible at all, since a guard that
 * cannot be unit tested is one nobody actually exercises before it ships.
 */

import { FREE_SYSTEMS, PLAN_LIMITS, type Plan } from "@/config/plans";
import { hasActiveSubscription, type SubscriptionState } from "./access-policy";

export type PlanState = {
  plan: Plan;
  /** Null means no expiry — still free, or a premium grant with no end
   * date (the lifetime tier). */
  planExpiresAt: Date | null;
};

/**
 * Whether this account counts as premium right now.
 *
 * Two independent paths grant it, and either is enough: an active Stripe
 * subscription from the original Phase 6 flow (`subscriptions`, unchanged
 * by this task), or `users.plan` being `"premium"` and not expired. That
 * second path is what a one-time-payment tier or a manual grant sets once
 * checkout exists — see the note in `config/plans.ts` — but nothing in
 * this task wires a payment up to set it automatically yet.
 */
export function isPremiumUser(
  input: {
    plan: PlanState;
    subscription: SubscriptionState | null;
  },
  now: Date = new Date(),
): boolean {
  if (hasActiveSubscription(input.subscription, now)) return true;
  if (input.plan.plan !== "premium") return false;
  return input.plan.planExpiresAt === null || input.plan.planExpiresAt > now;
}

/**
 * Whether a free account has full access to this section of this aircraft.
 *
 * An aircraft with no entry in `FREE_SYSTEMS` is fully open — this only
 * restricts the aircraft the owner has actually named, so adding the
 * restriction to a new aircraft is a config edit, not a code change, and
 * every aircraft that predates this feature keeps behaving as it always
 * did.
 */
export function canAccessSystem(topic: string, aircraftCode: string, isPremium: boolean): boolean {
  if (isPremium) return true;
  const free = FREE_SYSTEMS[aircraftCode.toUpperCase()];
  if (!free) return true;
  return free.includes(topic);
}

/** Narrows a requested list of sections down to the ones a free account
 * may actually draw from. An empty result is meaningful — see the caller
 * in `test/page.tsx`, which must not read it as "every section" the way
 * `parseTopics`'s own empty list does. */
export function filterAccessibleTopics(
  topics: string[],
  aircraftCode: string,
  isPremium: boolean,
): string[] {
  if (isPremium) return topics;
  const free = FREE_SYSTEMS[aircraftCode.toUpperCase()];
  if (!free) return topics;
  return topics.filter((topic) => free.includes(topic));
}

/**
 * The server-side guard the test page builds a test through.
 *
 * Mirrors the free-question-allowance cap already in `test/page.tsx`
 * rather than throwing: a section list is narrowed down to what the plan
 * may actually see, never rejected outright, because a mangled or
 * hand-edited URL should still hand a free student a test — just one built
 * only from the systems they have access to. `requested` empty means "every
 * section", exactly as `parseTopics` already defines it; premium passes
 * that straight through unchanged, since it has nothing to restrict.
 *
 * A free request naming only locked sections (a stale link, or someone
 * editing `?topic=`) cannot resolve to an *empty* accessible list, because
 * empty means "every section" to the query underneath this — so it falls
 * back to every free section instead, the same "never hand back nothing
 * when something is available" rule `resolveTestSize` already follows for
 * a mangled `?questions=`.
 */
export function resolveAllowedTopics(
  requested: string[],
  allTopics: string[],
  aircraftCode: string,
  isPremium: boolean,
): string[] {
  if (isPremium) return requested;
  const base = requested.length > 0 ? requested : allTopics;
  const allowed = filterAccessibleTopics(base, aircraftCode, false);
  return allowed.length > 0 ? allowed : filterAccessibleTopics(allTopics, aircraftCode, false);
}

/** The largest test this plan may sit, or the requested size if the plan
 * has no cap. Applied the same way the free-question allowance already
 * caps a fresh pick in `test/page.tsx` — before questions are fetched, not
 * after, so a capped student is never handed more than the plan allows. */
export function capQuestionCount(requested: number, isPremium: boolean): number {
  const limit = PLAN_LIMITS[isPremium ? "premium" : "free"].maxQuestionsPerTest;
  return limit === null ? requested : Math.min(requested, limit);
}

export function examModeAllowed(isPremium: boolean): boolean {
  return PLAN_LIMITS[isPremium ? "premium" : "free"].examModeAllowed;
}

export function smartTestAllowed(isPremium: boolean): boolean {
  return PLAN_LIMITS[isPremium ? "premium" : "free"].smartTestAllowed;
}
