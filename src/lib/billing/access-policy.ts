/**
 * Who may keep answering, and who has to subscribe first.
 *
 * Pure, like `grading.ts` and `test-options.ts`: no database here, only the
 * facts a caller already looked up. That is what makes the boundary between
 * "free" and "paid" a single, testable rule rather than something spread
 * across a query and an action.
 */

import { FREE_MODE } from "@/config/free-mode";

/**
 * How many distinct questions a signed-in user may answer on one aircraft
 * before a subscription is required. Per aircraft, not a total across the
 * whole bank, so trying the DA40 does not spend the allowance a student
 * meant for the B737.
 *
 * A question already answered before never counts twice — see
 * `hasAnsweredQuestionBefore` — so this is a one-time allowance per aircraft,
 * not a quota that renews.
 *
 * This is the **default**, not the only possible value: the owner can change
 * the allowance from `/owner/settings` without a deploy, and every function
 * below takes the figure as an argument so that this module stays pure and
 * the stored value has exactly one meaning. Callers that have not read the
 * settings fall back to this number, which is what the application shipped
 * with — see `src/lib/settings.ts`.
 */
export const FREE_QUESTIONS_PER_AIRCRAFT = 20;

/**
 * How many questions a **signed-out** visitor may be shown the answer to,
 * per aircraft, before they have to make an account.
 *
 * This is a different allowance from the one above, and deliberately a much
 * smaller one. `FREE_QUESTIONS_PER_AIRCRAFT` is what a student gets for
 * signing up; this is what the site gives away to somebody who has not, so
 * that trying it before committing to an account still works — the trade
 * `CLAUDE.md` has always made for signed-out practice, now with a number on
 * it instead of "unlimited".
 *
 * It is counted the same way and decided by the same function
 * (`canAnswerQuestion`, with this as the limit); only the identity it is
 * counted against differs — a cookie-borne visitor id rather than a user id.
 * See `previewAttempts` in `db/schema.ts` for what that identity is worth,
 * stated honestly.
 *
 * This is the **default**: the owner can change it at `/owner/settings`
 * without a deploy, exactly like the free allowance.
 */
export const PREVIEW_QUESTIONS_SIGNED_OUT = 5;

export type SubscriptionState = {
  status: "active" | "canceled" | "expired";
  /** Null briefly between checkout and the first confirming webhook. */
  currentPeriodEnd: Date | null;
};

/**
 * Whether a subscription currently grants full access.
 *
 * `status` alone is not enough: a subscription can be marked `active` by the
 * webhook that created it and still have a `currentPeriodEnd` in the past if
 * a cancellation or expiry notification is ever missed or delayed — this
 * checks both rather than trusting either on its own. A null
 * `currentPeriodEnd` on an `active` row means the first period has not been
 * confirmed yet and is treated as *not yet* active, not as unlimited.
 */
export function hasActiveSubscription(
  subscription: SubscriptionState | null,
  now: Date = new Date(),
): boolean {
  if (subscription === null) return false;
  if (subscription.status !== "active") return false;
  return subscription.currentPeriodEnd !== null && subscription.currentPeriodEnd > now;
}

/**
 * Whether a signed-in account may answer without the free-tier cap.
 *
 * Everything that decides what a *student* may see or answer asks this, never
 * `hasActiveSubscription` directly. In free mode (`config/free-mode.ts`) every
 * signed-in account has full access; otherwise it is exactly an active
 * subscription. The owner screens and the logbook meter keep using
 * `hasActiveSubscription`, because they report what was actually paid for.
 */
export function hasFullAccess(
  subscription: SubscriptionState | null,
  now: Date = new Date(),
  freeMode: boolean = FREE_MODE,
): boolean {
  return freeMode || hasActiveSubscription(subscription, now);
}

/** How many free questions are left on this aircraft, never negative. */
export function remainingFreeQuestions(
  distinctAnsweredSoFar: number,
  limit: number = FREE_QUESTIONS_PER_AIRCRAFT,
): number {
  return Math.max(0, limit - distinctAnsweredSoFar);
}

/**
 * Whole days of access left, or null when there is no confirmed period to
 * count against.
 *
 * Rounded **up**, deliberately: somebody with eleven hours left has a day of
 * studying ahead of them, and telling them "0 days" while the app still lets
 * them practise would be both wrong and alarming. Zero is therefore reserved
 * for access that has actually ended.
 *
 * Someone who paid, and more so someone spending a gift, should be able to
 * see what they have without opening a receipt — this is the number that
 * answers it.
 */
export function daysRemaining(
  currentPeriodEnd: Date | null,
  now: Date = new Date(),
): number | null {
  if (currentPeriodEnd === null) return null;
  const remaining = currentPeriodEnd.getTime() - now.getTime();
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

/**
 * What one of Stripe's subscription statuses means for the row stored here.
 *
 * Stripe has more states than this app tracks (`trialing`, `past_due`,
 * `unpaid`, `incomplete`, `incomplete_expired`, …) — there is no trial or
 * grace period offered here, so anything other than an outright `active` or
 * `trialing` subscription is treated as not granting access. This errs
 * toward cutting access off too early over too late, the same reasoning as
 * treating a `null` `currentPeriodEnd` as not-yet-active rather than
 * unlimited.
 */
export function mapStripeSubscriptionStatus(stripeStatus: string): "active" | "canceled" {
  return stripeStatus === "active" || stripeStatus === "trialing" ? "active" : "canceled";
}

/**
 * Whether answering this question may proceed.
 *
 * A subscriber always may. Someone without one may answer a question they
 * have already answered before — that never cost anything the first time
 * either, in the sense that it does not consume a *second* slot — or a new
 * one, provided the aircraft's free allowance is not already used up.
 *
 * The allowance is passed in rather than read from the constant, because the
 * owner can change it: this function has to be able to say what the answer
 * is for *today's* limit, and a pure function cannot go and look it up.
 */
export function canAnswerQuestion(input: {
  hasSubscription: boolean;
  alreadyAnsweredThisQuestion: boolean;
  distinctAnsweredSoFar: number;
  limit?: number;
}): boolean {
  if (input.hasSubscription) return true;
  if (input.alreadyAnsweredThisQuestion) return true;
  return input.distinctAnsweredSoFar < (input.limit ?? FREE_QUESTIONS_PER_AIRCRAFT);
}
