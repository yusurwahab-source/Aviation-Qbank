/**
 * Who may keep answering, and who has to subscribe first.
 *
 * Pure, like `grading.ts` and `test-options.ts`: no database here, only the
 * facts a caller already looked up. That is what makes the boundary between
 * "free" and "paid" a single, testable rule rather than something spread
 * across a query and an action.
 */

/**
 * How many distinct questions a signed-in user may answer on one aircraft
 * before a subscription is required. Per aircraft, not a total across the
 * whole bank, so trying the DA40 does not spend the allowance a student
 * meant for the B737.
 *
 * A question already answered before never counts twice — see
 * `hasAnsweredQuestionBefore` — so this is a one-time allowance per aircraft,
 * not a quota that renews.
 */
export const FREE_QUESTIONS_PER_AIRCRAFT = 20;

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

/** How many free questions are left on this aircraft, never negative. */
export function remainingFreeQuestions(distinctAnsweredSoFar: number): number {
  return Math.max(0, FREE_QUESTIONS_PER_AIRCRAFT - distinctAnsweredSoFar);
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
 */
export function canAnswerQuestion(input: {
  hasSubscription: boolean;
  alreadyAnsweredThisQuestion: boolean;
  distinctAnsweredSoFar: number;
}): boolean {
  if (input.hasSubscription) return true;
  if (input.alreadyAnsweredThisQuestion) return true;
  return input.distinctAnsweredSoFar < FREE_QUESTIONS_PER_AIRCRAFT;
}
