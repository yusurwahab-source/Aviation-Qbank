/**
 * Who may scan how many logbook spreads. Pure and tested, like
 * `access-policy.ts` beside the question banks.
 *
 * - Every account gets `FREE_SPREADS_PER_ACCOUNT` spreads, once, with the
 *   full error report.
 * - An unlocked logbook takes up to `SPREADS_PER_UNLOCK` more.
 * - An unlock is one credit: from a license code, from the owner, from a
 *   purchase once a provider is connected — or, once, from an active
 *   PilotQBank subscription.
 *
 * The free spreads are spent first, on whichever logbook a student starts
 * with, so unlocking never wastes them.
 */

export const FREE_SPREADS_PER_ACCOUNT = 2;
export const SPREADS_PER_UNLOCK = 40;
/** One-time unlock price, in euro cents. Shown only when purchases are on. */
export const LOGBOOK_UNLOCK_PRICE_EUR_CENTS = 499;
/** Largest photo the server accepts, before the client has compressed it. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type ExtractionDecision =
  | { allowed: true; chargeTo: "free" | "unlock" }
  | { allowed: false; reason: "free_exhausted" | "logbook_full" };

/**
 * Free mode (`config/free-mode.ts`): no spreads are sold or metered per
 * account, and every logbook takes up to `SPREADS_PER_UNLOCK` spreads. They
 * are still recorded as `unlock` spreads so the per-logbook cap and the
 * owner's cost figures keep working unchanged. The caller passes the flag;
 * the default is off, so these pure rules keep their paid meaning.
 */
export function decideExtraction(input: {
  freeSpreadsUsed: number;
  logbookUnlocked: boolean;
  logbookUnlockSpreadsUsed: number;
  freeMode?: boolean;
}): ExtractionDecision {
  if (input.freeMode) {
    return input.logbookUnlockSpreadsUsed < SPREADS_PER_UNLOCK
      ? { allowed: true, chargeTo: "unlock" }
      : { allowed: false, reason: "logbook_full" };
  }
  if (input.freeSpreadsUsed < FREE_SPREADS_PER_ACCOUNT) return { allowed: true, chargeTo: "free" };
  if (!input.logbookUnlocked) return { allowed: false, reason: "free_exhausted" };
  if (input.logbookUnlockSpreadsUsed < SPREADS_PER_UNLOCK) return { allowed: true, chargeTo: "unlock" };
  return { allowed: false, reason: "logbook_full" };
}

/** Spreads this logbook can still take, counting what is left free. */
export function spreadsRemaining(input: {
  freeSpreadsUsed: number;
  logbookUnlocked: boolean;
  logbookUnlockSpreadsUsed: number;
  freeMode?: boolean;
}): number {
  if (input.freeMode) return Math.max(0, SPREADS_PER_UNLOCK - input.logbookUnlockSpreadsUsed);
  const free = Math.max(0, FREE_SPREADS_PER_ACCOUNT - input.freeSpreadsUsed);
  const unlock = input.logbookUnlocked ? Math.max(0, SPREADS_PER_UNLOCK - input.logbookUnlockSpreadsUsed) : 0;
  return free + unlock;
}

/** Unlocks a student could spend right now. */
export function availableUnlocks(input: {
  unusedCredits: number;
  hasActiveSubscription: boolean;
  subscriptionCreditUsed: boolean;
}): number {
  const included = input.hasActiveSubscription && !input.subscriptionCreditUsed ? 1 : 0;
  return input.unusedCredits + included;
}

/** Which credit an unlock spends: a held credit before the subscriber's
 * included one, so a subscription that lapses does not strand a code. */
export function pickUnlockSource(input: {
  unusedCredits: number;
  hasActiveSubscription: boolean;
  subscriptionCreditUsed: boolean;
}): "credit" | "subscription" | null {
  if (input.unusedCredits > 0) return "credit";
  if (input.hasActiveSubscription && !input.subscriptionCreditUsed) return "subscription";
  return null;
}

export function formatEuro(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}
