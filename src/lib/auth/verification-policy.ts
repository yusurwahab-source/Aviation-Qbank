import { resetTokenState, type ResetTokenFacts, type ResetTokenState } from "./reset-policy";

/**
 * The rules an email verification link obeys.
 *
 * A link has exactly the lifecycle a reset link has — valid, expired, used or
 * unknown — so the decision is the same function rather than a second copy
 * that could drift from it. What differs is the lifetime: a day, not an hour.
 * A verification link grants nothing on its own (it proves an inbox, it does
 * not open an account), so there is no reason to make somebody who reads
 * their mail tomorrow ask again.
 */

export const VERIFICATION_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;

export type VerificationTokenState = ResetTokenState;
export type VerificationTokenFacts = ResetTokenFacts;

export const verificationTokenState = resetTokenState;

/** When a link issued now should stop working. */
export function verificationExpiryFrom(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + VERIFICATION_TOKEN_LIFETIME_MS);
}
