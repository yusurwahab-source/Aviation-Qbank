import { z } from "zod";

/**
 * What counts as an acceptable email and password.
 *
 * Pure and dependency-light so it can be unit tested and reused by both the
 * sign-up and log-in actions.
 */

/**
 * Minimum 8 characters, and no rules about symbols or capitals.
 *
 * That follows NIST 800-63B: composition rules push people towards predictable
 * substitutions ("Password1!") and towards writing passwords down. Length is
 * what actually helps.
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * An upper bound exists only to stop someone sending a megabyte of text and
 * making the server do expensive hashing work on it.
 */
export const MAX_PASSWORD_LENGTH = 200;

export const MAX_EMAIL_LENGTH = 254;

/**
 * Normalises an email for storage and lookup: trimmed and lowercased, so
 * `Yusur@Example.COM ` and `yusur@example.com` are the same account and cannot
 * both be registered.
 */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address")
  .max(MAX_EMAIL_LENGTH, "That email address is too long")
  .pipe(z.email("Enter a valid email address"))
  .transform(normaliseEmail);

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, "That password is too long");

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Log in deliberately does not apply the password rules.
 *
 * If it did, an account created before the rules changed could no longer log
 * in, and rejecting a short password at the form would quietly confirm that no
 * account uses it. Only the length ceiling is kept, to bound hashing work.
 */
export const logInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(MAX_PASSWORD_LENGTH),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LogInInput = z.infer<typeof logInSchema>;
