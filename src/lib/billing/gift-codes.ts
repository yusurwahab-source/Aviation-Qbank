/**
 * Free, single-use codes that grant full access without Stripe.
 *
 * Pure, like `access-policy.ts`: everything here is a function of its
 * arguments, so the shape of a code and the arithmetic of redeeming one can
 * be asserted directly, with no database in the loop.
 */

/**
 * Excludes `0`, `1`, `I`, `L`, `O` — the letters and digits a person is most
 * likely to mistake for one another when copying a code by hand. 32 symbols
 * divides 256 evenly, so mapping a random byte onto it by `% 32` carries no
 * bias toward any symbol.
 */
const GIFT_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const GIFT_CODE_LENGTH = 16;
const GIFT_CODE_GROUP_SIZE = 4;

/**
 * Turns 16 random bytes into a code such as `7K4M-QX2P-9RTN-5VWZ`.
 *
 * The randomness is passed in rather than read from `node:crypto` here, so
 * this stays pure: the caller (`createGiftCodes`) supplies real randomness,
 * a test supplies a fixed byte sequence and asserts the exact string it
 * produces.
 */
export function generateGiftCode(randomBytes: Uint8Array): string {
  if (randomBytes.length < GIFT_CODE_LENGTH) {
    throw new Error(`generateGiftCode needs at least ${GIFT_CODE_LENGTH} random bytes`);
  }

  let flat = "";
  for (let i = 0; i < GIFT_CODE_LENGTH; i++) {
    flat += GIFT_CODE_ALPHABET[randomBytes[i] % GIFT_CODE_ALPHABET.length];
  }

  const groups: string[] = [];
  for (let i = 0; i < flat.length; i += GIFT_CODE_GROUP_SIZE) {
    groups.push(flat.slice(i, i + GIFT_CODE_GROUP_SIZE));
  }
  return groups.join("-");
}

/**
 * The form a code is looked up by, regardless of how it was typed:
 * uppercased, with any dashes, spaces or other separators stripped out.
 * Both `createGiftCodes` and `redeemGiftCode` store and query this shape —
 * a redeemer pasting `7k4m qx2p 9rtn 5vwz` finds the same row as one pasting
 * `7K4M-QX2P-9RTN-5VWZ`.
 */
export function normalizeGiftCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * What a code is worth if redeemed right now, given whatever access the
 * account already has.
 *
 * A gift code only ever extends access, never shortens it: redeeming one
 * while a real, later-expiring Stripe subscription is active must not pull
 * that expiry date backward. This is the whole of that rule, expressed as
 * one comparison — `redeemGiftCode` is the only caller, and it is what lets
 * a subscribed student redeem a gift code (from a friend, a promotion) with
 * no way to end up worse off than before.
 */
/**
 * Whether a code has gone stale on its own, distinct from being disabled or
 * fully redeemed. `now` defaults to the real clock but takes one explicitly
 * so this stays callable from a server component's render body without
 * calling `Date.now()`/`new Date()` there directly.
 */
export function isGiftCodeExpired(expiresAt: Date | null, now: Date = new Date()): boolean {
  return expiresAt !== null && expiresAt.getTime() <= now.getTime();
}

export function computeGiftPeriodEnd(
  now: Date,
  durationDays: number,
  existingPeriodEnd: Date | null,
): Date {
  const granted = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  if (existingPeriodEnd && existingPeriodEnd.getTime() > granted.getTime()) {
    return existingPeriodEnd;
  }
  return granted;
}
