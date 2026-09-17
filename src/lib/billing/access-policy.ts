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

/** How long a paid period lasts, in days, once a payment is confirmed. */
const PLAN_DURATION_DAYS: Record<"monthly" | "yearly", number> = {
  monthly: 30,
  yearly: 365,
};

/**
 * When a period started now ends, for the plan just paid for.
 *
 * Derived from the plan itself rather than read from anything the payment
 * provider's webhook claims — the same reasoning as `deadlineFrom` in
 * `test-options.ts`: a value this app computes from a fact it already knows
 * cannot drift from that fact, where a value trusted from elsewhere could.
 */
export function periodEndFor(plan: "monthly" | "yearly", from: Date = new Date()): Date {
  return new Date(from.getTime() + PLAN_DURATION_DAYS[plan] * 24 * 60 * 60 * 1000);
}

/**
 * What a 2Checkout order status means for the subscription it belongs to.
 *
 * `null` covers every in-between status (`PENDING`, `PROCESSING`, and
 * anything not listed here) — deliberately a no-op rather than a guess,
 * because a webhook the caller cannot yet interpret must leave the existing
 * row alone rather than downgrade it on a status that says nothing final.
 */
const ORDER_STATUS_MEANS_ACTIVE = new Set(["COMPLETE", "PAYMENT_RECEIVED"]);
const ORDER_STATUS_MEANS_CANCELED = new Set([
  "CANCELED",
  "REFUND",
  "REVERSED",
  "CHARGEBACK_OPEN",
  "CHARGEBACK_CLOSED",
]);

export function subscriptionStatusForOrderStatus(
  orderStatus: string,
): "active" | "canceled" | null {
  const normalised = orderStatus.trim().toUpperCase();
  if (ORDER_STATUS_MEANS_ACTIVE.has(normalised)) return "active";
  if (ORDER_STATUS_MEANS_CANCELED.has(normalised)) return "canceled";
  return null;
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
