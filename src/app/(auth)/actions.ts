"use server";

import { redirect } from "next/navigation";

import {
  checkLoginAllowed,
  checkResetAllowed,
  clearFailedLogins,
  clearFailedLoginsAfterReset,
  recordFailedLogin,
  recordResetRequest,
} from "@/db/login-attempts";
import { consumeResetToken, findResetToken, issueResetToken } from "@/db/password-reset";
import { createUser, findUserByEmail, updatePasswordHash } from "@/db/users";
import { getClientIp } from "@/lib/auth/client-ip";
import { emailSchema, logInSchema, passwordSchema, signUpSchema } from "@/lib/auth/credentials";
import { describeWait } from "@/lib/auth/rate-limit-policy";
import { withMinimumDuration } from "@/lib/auth/reset-policy";
import { createSession, destroyAllSessions, destroySession } from "@/lib/auth/session";
import { passwordChangedEmail } from "@/lib/email/password-changed-email";
import { resetEmail } from "@/lib/email/reset-email";
import { consumeVerificationToken } from "@/db/email-verification";
import { sendVerificationEmail } from "@/lib/auth/verification-mail";
import { appUrl, sendEmail } from "@/lib/email/send";
import { hashPassword, needsRehash, unmatchableHash, verifyPassword } from "@/lib/password";

/**
 * Sign up, log in and log out.
 *
 * These run only on the server, so a password is hashed before it is ever
 * stored and is never sent back to the browser in any form.
 */

export type AuthFormState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
  /** Kept so a failed submit does not wipe what the user typed. */
  email?: string;
};

/** Verified against when an email has no account; see `unmatchableHash`. */
const NO_SUCH_USER_HASH = unmatchableHash();

export async function signUp(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const parsed = signUpSchema.safeParse({ email, password });
  if (!parsed.success) {
    const fieldErrors: AuthFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "email" && !fieldErrors.email) fieldErrors.email = issue.message;
      if (field === "password" && !fieldErrors.password) fieldErrors.password = issue.message;
    }
    return { fieldErrors, email };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await createUser(parsed.data.email, passwordHash);

  if (!user) {
    return {
      fieldErrors: { email: "An account with that email already exists" },
      email,
    };
  }

  // Best effort and never blocking: practice does not wait on an inbox.
  await sendVerificationEmail(user.id, user.email);

  await createSession(user.id);
  redirect("/");
}

export async function logIn(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const parsed = logInSchema.safeParse({ email, password });
  if (!parsed.success) {
    const fieldErrors: AuthFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "email" && !fieldErrors.email) fieldErrors.email = issue.message;
      if (field === "password" && !fieldErrors.password) fieldErrors.password = issue.message;
    }
    return { fieldErrors, email };
  }

  const ip = await getClientIp();

  // Checked before the password is verified, not after. Verification costs
  // about half a second of CPU and 128 MB by design, so refusing early is what
  // stops a flood of guesses exhausting the server. The count is keyed on the
  // submitted address whether or not an account exists, so a blocked response
  // never reveals which addresses are registered.
  const allowed = await checkLoginAllowed(ip, parsed.data.email);
  if (!allowed.allowed) {
    return {
      error: `Too many failed attempts. Try again ${describeWait(allowed.retryAfterMs)}.`,
      email,
    };
  }

  const user = await findUserByEmail(parsed.data.email);

  // Always hash, even with no account, so both failures cost the same.
  const isValid = await verifyPassword(parsed.data.password, user?.passwordHash ?? NO_SUCH_USER_HASH);

  if (!user || !isValid) {
    await recordFailedLogin(ip, parsed.data.email);
    // One message for both cases: naming which half was wrong would confirm
    // whether an address has an account here.
    return { error: "Email or password is incorrect", email };
  }

  // Knowing the password clears this address's failures, so someone who simply
  // mistyped a few times is not held back on their next visit.
  await clearFailedLogins(parsed.data.email);

  // Take the opportunity to upgrade a hash made with older, cheaper settings.
  if (needsRehash(user.passwordHash)) {
    await updatePasswordHash(user.id, await hashPassword(parsed.data.password));
  }

  await createSession(user.id);
  redirect("/");
}

export async function logOut(): Promise<void> {
  await destroySession();
  redirect("/");
}

/* ─────────────────────────── Password reset ─────────────────────────── */

export type ResetRequestState = {
  /** Set once the form has been answered; the screen then replaces itself. */
  done?: boolean;
  error?: string;
  fieldErrors?: { email?: string };
  email?: string;
};

/**
 * Asks for a reset link.
 *
 * The whole design of this function is one property: **it answers the same
 * way whether or not the address has an account.** Same words, and — via
 * `withMinimumDuration` — the same time. Anything else turns this form into a
 * way to ask the site which of a list of addresses are registered, which is
 * the same leak the log-in screen is carefully built to avoid.
 *
 * So there is no "no account with that email" branch to be found below. The
 * work differs; the answer does not.
 */
export async function requestPasswordReset(
  _previous: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "");

  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { fieldErrors: { email: parsed.error.issues[0]?.message ?? "Enter your email address" }, email };
  }

  const address = parsed.data;
  const ip = await getClientIp();

  // Before any work, and counted on the submitted address whether or not an
  // account exists — so being refused says nothing about who is registered.
  const allowed = await checkResetAllowed(ip, address);
  if (!allowed.allowed) {
    return {
      error: `Too many reset requests. Try again ${describeWait(allowed.retryAfterMs)}.`,
      email,
    };
  }
  await recordResetRequest(ip, address);

  await withMinimumDuration(async () => {
    try {
      const user = await findUserByEmail(address);
      if (!user) return;

      const token = await issueResetToken(user.id);
      const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
      await sendEmail(resetEmail(user.email, link));
    } catch (error) {
      // Swallowed on purpose. Whether the mail went out is not the sender's
      // business to learn, and `sendEmail` never throws for delivery failures
      // anyway — this catches a database that is down, which must not be
      // reported differently from an address with no account.
      console.error("Password reset request failed:", error);
    }
  });

  return { done: true, email: address };
}

export type ResetPasswordState = {
  error?: string;
  fieldErrors?: { password?: string; confirm?: string };
};

/**
 * Sets a new password from a link.
 *
 * Three things happen together, and all three matter:
 *
 * 1. The link is spent, atomically, so it cannot be used twice.
 * 2. **Every existing session is destroyed.** This is the point of a reset as
 *    a security measure rather than a convenience: if somebody else knew the
 *    old password, changing it while leaving their session alive would have
 *    achieved nothing.
 * 3. The address's failed log ins are cleared. Someone who has forgotten
 *    their password has very likely just hit the rate limit trying to guess
 *    it, and it would be absurd to hand them a working password and then
 *    refuse to let them use it.
 */
export async function resetPassword(
  _previous: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return { fieldErrors: { password: parsed.error.issues[0]?.message } };
  }

  // Worth its own field rather than trusting the typing. A mistyped new
  // password here is not an inconvenience — it is being locked out of the
  // account by the very thing that was meant to restore access.
  if (password !== confirm) {
    return { fieldErrors: { confirm: "The two passwords do not match" } };
  }

  // Checked before hashing, not after. Hashing costs half a second of CPU and
  // 128 MB by design, so an invented token must not be able to buy that —
  // the same reasoning as checking the rate limit before verifying a log in.
  const lookup = await findResetToken(token);
  if (lookup.state !== "valid") return { error: describeResetFailure(lookup.state) };

  const passwordHash = await hashPassword(parsed.data);

  // Atomic, so two submissions racing cannot both succeed: the second finds
  // the row already spent.
  const outcome = await consumeResetToken(token, passwordHash);
  if (!outcome.ok) return { error: describeResetFailure(outcome.state) };

  await destroyAllSessions(outcome.userId);
  await clearFailedLoginsAfterReset(lookup.email);

  // Tells the inbox, so a reset somebody else started and finished is not
  // silent. Never throws; what the student is told does not depend on it.
  await sendEmail(passwordChangedEmail(lookup.email, `${appUrl()}/forgot-password`));

  // Signed straight in. They have just proved control of the inbox and set a
  // password; making them type it again immediately would be ceremony.
  await createSession(outcome.userId);
  redirect("/");
}

/**
 * What to say about a link that did not work.
 *
 * The three failures are told apart deliberately. A vaguer single message
 * would be no more private — a reset link is a secret in itself, so somebody
 * holding one already knows more than these words add — and it would leave a
 * person unable to tell "you already used this" from "this has expired", when
 * the two call for different next steps.
 */
function describeResetFailure(state: "expired" | "used" | "unknown"): string {
  if (state === "used") {
    return "That link has already been used. Ask for a new one if you still need to change your password.";
  }
  if (state === "expired") {
    return "That link has expired. Ask for a new one and use it within the hour.";
  }
  return "That link is not valid. It may have been replaced by a newer one — ask for another.";
}

/* ───────────────────────── Email verification ───────────────────────── */

export type ConfirmEmailState = { done?: boolean; error?: string };

/**
 * Spends a verification link. A POST, not the page load, for the reason reset
 * links work this way: mail clients and security scanners open links, and
 * opening must not be the same thing as confirming.
 */
export async function confirmEmail(
  _previous: ConfirmEmailState,
  formData: FormData,
): Promise<ConfirmEmailState> {
  const token = String(formData.get("token") ?? "");
  const outcome = await consumeVerificationToken(token);
  if (outcome.ok) return { done: true };

  return {
    error:
      outcome.state === "used"
        ? "That link has already been used."
        : outcome.state === "expired"
          ? "That link has expired. Ask for a new one from your Account page."
          : "That link is not valid. It may have been replaced by a newer one.",
  };
}
