/**
 * How many failed log ins are too many.
 *
 * A pure decision function: given a count of recent failures and when the
 * oldest of them happened, it says whether to allow the attempt and how long to
 * wait if not. No database, no clock of its own — so it can be unit tested
 * exhaustively, in the same style as grading and password hashing.
 */

export type RateLimitRule = {
  /** Failures allowed inside the window before attempts are refused. */
  maxFailures: number;
  /** How far back failures are counted, in milliseconds. */
  windowMs: number;
};

export type RateLimitDecision =
  | { allowed: true }
  | {
      allowed: false;
      /** Milliseconds until the oldest counted failure falls out of the window. */
      retryAfterMs: number;
    };

const MINUTE = 60 * 1000;

/**
 * Two rules, applied together.
 *
 * Neither ever locks an account permanently. That matters concretely here:
 * there is no password reset yet, so a permanent lock would be unrecoverable
 * without deleting the user's row by hand. Both rules expire on their own.
 */
export const RATE_LIMIT_RULES = {
  /**
   * Per source address. The broad brake: it slows a machine grinding through
   * passwords without touching anyone's account.
   */
  perIp: { maxFailures: 20, windowMs: 15 * MINUTE } satisfies RateLimitRule,

  /**
   * Per email typed into the form — whether or not an account exists for it.
   * Tighter, because a real person rarely fails five times in a row, while
   * someone guessing one account's password will.
   */
  perEmail: { maxFailures: 5, windowMs: 15 * MINUTE } satisfies RateLimitRule,
} as const;

/**
 * Decides whether an attempt may proceed.
 *
 * `oldestFailureAt` is the timestamp of the earliest failure still inside the
 * window. The wait is measured from that one, so the limit lifts gradually as
 * old failures age out rather than all at once.
 */
export function decide(
  rule: RateLimitRule,
  failures: number,
  oldestFailureAt: Date | null,
  now: Date = new Date(),
): RateLimitDecision {
  if (failures < rule.maxFailures) return { allowed: true };

  // No timestamp means nothing to expire against; let it through rather than
  // block forever on incomplete data.
  if (!oldestFailureAt) return { allowed: true };

  const retryAfterMs = oldestFailureAt.getTime() + rule.windowMs - now.getTime();

  // The window has already passed; the caller's count was simply stale.
  if (retryAfterMs <= 0) return { allowed: true };

  return { allowed: false, retryAfterMs };
}

/**
 * Combines the per-address and per-email decisions.
 * Blocked by either means blocked, and the longer wait is the one reported.
 */
export function combine(decisions: RateLimitDecision[]): RateLimitDecision {
  const blocked = decisions.filter((d) => !d.allowed);
  if (blocked.length === 0) return { allowed: true };

  return {
    allowed: false,
    retryAfterMs: Math.max(...blocked.map((d) => d.retryAfterMs)),
  };
}

/** Turns a wait into words a person can act on: "try again in 12 minutes". */
export function describeWait(retryAfterMs: number): string {
  const seconds = Math.ceil(retryAfterMs / 1000);
  if (seconds <= 60) return "in less than a minute";

  const minutes = Math.ceil(seconds / 60);
  if (minutes === 1) return "in about a minute";
  if (minutes < 60) return `in about ${minutes} minutes`;

  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? "in about an hour" : `in about ${hours} hours`;
}
