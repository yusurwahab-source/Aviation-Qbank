/**
 * The rules a password reset link obeys.
 *
 * Pure, with no database and no clock of its own, in the same style as the
 * rate-limit policy beside it. A reset link is the one thing in this app that
 * can take an account over without knowing its password, so the conditions
 * under which it works are worth asserting directly rather than leaving
 * scattered through a query.
 */

const MINUTE = 60 * 1000;

/**
 * How long a link lasts.
 *
 * An hour is the usual answer, and the reasoning is a trade rather than a
 * convention: the link sits in an inbox, so every extra minute is another
 * minute in which a borrowed phone or a forwarded message is enough to take
 * the account. Long enough to walk away from the computer and come back;
 * short enough that a stale email is not a key.
 */
export const RESET_TOKEN_LIFETIME_MS = 60 * MINUTE;

/**
 * How long the request form waits before answering, whatever it did.
 *
 * The point is that "we sent you a link" and "there is no such account" must
 * take the same time to say. Sending an email costs a few hundred
 * milliseconds; finding no account costs almost nothing, and that difference
 * is a way to test whether an address is registered — exactly what the
 * identical wording exists to prevent.
 *
 * So both paths are padded out to this floor. It is set comfortably above a
 * normal send, and the honest limit is stated in CLAUDE.md: a send that runs
 * *over* the floor is still distinguishable. That is a much smaller signal
 * than the raw difference, and closing it entirely would mean queueing the
 * mail, which is not worth a table at this size.
 */
export const RESET_RESPONSE_FLOOR_MS = 900;

/** What a token turned out to be when someone tried to use it. */
export type ResetTokenState =
  /** Good: unspent, unexpired, and it exists. */
  | "valid"
  /** Past its hour. */
  | "expired"
  /** Already spent — a second click on the same link, or a replay. */
  | "used"
  /** No such token. Either invented, or superseded and cleared away. */
  | "unknown";

export type ResetTokenFacts = {
  expiresAt: Date;
  usedAt: Date | null;
};

/**
 * Whether a link may be used, from the row it names.
 *
 * `null` means no row, which is deliberately its own answer rather than
 * folded into "expired": the screen says the same thing for all three
 * failures, but the server can tell them apart, and a test can assert that
 * each is actually refused.
 *
 * Order matters. A spent token reports "used" even after it has also expired,
 * because "you have already used this link" is the more useful truth and the
 * one that does not invite a retry.
 */
export function resetTokenState(
  facts: ResetTokenFacts | null,
  now: Date = new Date(),
): ResetTokenState {
  if (!facts) return "unknown";
  if (facts.usedAt) return "used";
  if (facts.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}

/** When a link issued now should stop working. */
export function resetExpiryFrom(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + RESET_TOKEN_LIFETIME_MS);
}

/**
 * Runs `work`, then waits until at least `floorMs` has passed since it
 * started.
 *
 * This is how the request form keeps its two answers indistinguishable. It
 * pads, never truncates: work that overruns the floor is returned as soon as
 * it is done rather than being made to wait longer still.
 *
 * `now` is injectable so the padding can be tested without actually sleeping.
 */
export async function withMinimumDuration<T>(
  work: () => Promise<T>,
  floorMs: number = RESET_RESPONSE_FLOOR_MS,
  sleep: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => number = () => Date.now(),
): Promise<T> {
  const startedAt = now();
  try {
    return await work();
  } finally {
    // In `finally` so a thrown failure is padded too. Otherwise the one path
    // that can fail fast — an exception — becomes the timing channel that
    // everything else here exists to close.
    const remaining = floorMs - (now() - startedAt);
    if (remaining > 0) await sleep(remaining);
  }
}
