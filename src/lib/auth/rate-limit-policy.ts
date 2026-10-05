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
 * Neither ever locks an account permanently. Both rules expire on their own.
 *
 * That mattered absolutely before password reset existed: a permanent lock
 * was unrecoverable without deleting the user's row by hand. There is now a
 * second way out — a completed reset clears the address's failures — but the
 * rule stays, because a lock that could only be lifted through an inbox
 * would strand anyone whose mail is not working.
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

  /**
   * Password reset requests, per address asked for.
   *
   * A different thing being counted: not failures, but *requests*, because a
   * reset request has no failure to count — every one that names a real
   * account sends an email. What this limits is therefore mail, not guessing.
   * Without it, anybody could point the form at someone else's address and
   * have this site post them a hundred messages.
   *
   * Three an hour is generous for the real case (the first did not arrive;
   * try again) and useless as a way to flood an inbox.
   */
  resetPerEmail: { maxFailures: 3, windowMs: 60 * MINUTE } satisfies RateLimitRule,

  /**
   * Reset requests per source address. Stops one machine walking a list of
   * addresses to see which ones this site will send mail to — the same
   * enumeration the identical wording exists to prevent, approached from the
   * side of volume rather than of timing.
   */
  resetPerIp: { maxFailures: 15, windowMs: 60 * MINUTE } satisfies RateLimitRule,

  /**
   * Verification emails, per address. The limit is about mail, exactly like
   * `resetPerEmail`: every request for a real, unverified account sends one,
   * and without a ceiling the "send it again" button is a way to fill
   * somebody's inbox. Its own key prefix, so asking for verification mail can
   * never use up somebody's ability to ask for a password reset.
   */
  verifyPerEmail: { maxFailures: 3, windowMs: 60 * MINUTE } satisfies RateLimitRule,

  /** Verification emails per source address — the broad brake. */
  verifyPerIp: { maxFailures: 15, windowMs: 60 * MINUTE } satisfies RateLimitRule,

  /**
   * Gift code redemption attempts, per signed-in account. A code is 80 bits
   * of randomness — nobody legitimate fails more than a handful of times in
   * a row — so this is tight, the same reasoning as `perEmail` for log in.
   */
  redeemPerUser: { maxFailures: 10, windowMs: 15 * MINUTE } satisfies RateLimitRule,

  /**
   * Redemption attempts per source address — the broad brake against one
   * machine grinding through the code space regardless of which account it
   * is signed in as.
   */
  redeemPerIp: { maxFailures: 30, windowMs: 15 * MINUTE } satisfies RateLimitRule,

  /**
   * Answers handed to a **signed-out** caller, per source address.
   *
   * The only rule here that is not about guessing a secret. What it bounds
   * is a scripted scrape of the question bank: `answerQuestion` returns the
   * correct option and the explanation for one question, and signed out
   * there is no account to count that against — only a cookie the caller is
   * free to drop. So this is the limit that actually holds, and the preview
   * allowance beside it is the product rule it backs up.
   *
   * Counted per *request*, not per failure, the same as reset requests: a
   * signed-out answer that succeeds is exactly the thing being metered.
   *
   * Forty in fifteen minutes is far more than the preview allowance itself
   * (five questions on one aircraft), so several genuine visitors behind one
   * office or airline NAT are unaffected, while reading an 800-question bank
   * this way would take a scraper the better part of a day rather than a
   * couple of minutes.
   */
  previewPerIp: { maxFailures: 40, windowMs: 15 * MINUTE } satisfies RateLimitRule,

  /**
   * Logbook Scanner uploads, per signed-in account. Counted per request,
   * like the preview: every upload is a paid model call, so what this
   * protects is the bill. Sixty an hour is a whole 40-spread logbook with
   * room for retakes; nobody photographing pages by hand goes faster.
   */
  logbookPerUser: { maxFailures: 60, windowMs: 60 * MINUTE } satisfies RateLimitRule,
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
