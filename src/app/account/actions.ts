"use server";

import {
  checkLoginAllowed,
  checkVerifyAllowed,
  clearFailedLogins,
  recordFailedLogin,
  recordVerifyRequest,
} from "@/db/login-attempts";
import { sendVerificationEmail } from "@/lib/auth/verification-mail";
import { findUserByEmail, updatePasswordHash } from "@/db/users";
import { getClientIp } from "@/lib/auth/client-ip";
import { passwordSchema } from "@/lib/auth/credentials";
import { describeWait } from "@/lib/auth/rate-limit-policy";
import { createSession, destroyAllSessions, getCurrentUser } from "@/lib/auth/session";
import { passwordChangedEmail } from "@/lib/email/password-changed-email";
import { appUrl, sendEmail } from "@/lib/email/send";
import { hashPassword, verifyPassword } from "@/lib/password";

export type ChangePasswordState = {
  done?: boolean;
  error?: string;
  fieldErrors?: { current?: string; password?: string; confirm?: string };
};

/**
 * Changes the password of the signed-in account.
 *
 * Its own entry point, so it asks who is signed in for itself rather than
 * trusting that the page did. Four things matter, in this order:
 *
 * 1. **The current password is required**, because a session is not proof
 *    of who is at the keyboard — a borrowed laptop or a stolen cookie must
 *    not be enough to take an account over.
 * 2. **The rate limit runs before the password is verified**, on the same
 *    counters as log in, for the same reason: verification costs half a
 *    second and 128 MB, and this form is otherwise a password-guessing
 *    oracle for anyone holding a session. A wrong current password counts
 *    as a failed log in. That can briefly hold up the next real log in; it
 *    always expires on its own.
 * 3. **Every other session is destroyed**, and this device gets a fresh one,
 *    so changing a password because you suspect someone else has it
 *    actually removes them.
 * 4. **A notice goes to the inbox**, so a change somebody else made is not
 *    silent. Delivery never changes what the student is told.
 */
export async function changePassword(
  _previous: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session has ended. Log in again to change your password." };

  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (current === "") return { fieldErrors: { current: "Enter your current password" } };

  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { fieldErrors: { password: parsed.error.issues[0]?.message } };

  if (password !== confirm) return { fieldErrors: { confirm: "The two passwords do not match" } };
  if (password === current) {
    return { fieldErrors: { password: "Choose a password different from the current one" } };
  }

  const ip = await getClientIp();
  const allowed = await checkLoginAllowed(ip, user.email);
  if (!allowed.allowed) {
    return { error: `Too many failed attempts. Try again ${describeWait(allowed.retryAfterMs)}.` };
  }

  const account = await findUserByEmail(user.email);
  if (!account || !(await verifyPassword(current, account.passwordHash))) {
    await recordFailedLogin(ip, user.email);
    return { fieldErrors: { current: "That is not your current password" } };
  }

  await clearFailedLogins(user.email);
  await updatePasswordHash(user.id, await hashPassword(parsed.data));

  await destroyAllSessions(user.id);
  await createSession(user.id);

  await sendEmail(passwordChangedEmail(user.email, `${appUrl()}/forgot-password`));

  return { done: true };
}

export type ResendVerificationState = { sent?: boolean; error?: string };

/**
 * Sends the signed-in student a new verification link.
 *
 * Rate limited on mail, not guessing — see `verifyPerEmail` — and counted
 * before anything is sent. Asks who is signed in for itself, like every
 * action here, and does nothing for an address already verified.
 */
export async function resendVerification(): Promise<ResendVerificationState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session has ended. Log in again." };
  if (user.emailVerified) return { sent: true };

  const ip = await getClientIp();
  const allowed = await checkVerifyAllowed(ip, user.email);
  if (!allowed.allowed) {
    return { error: `Too many requests. Try again ${describeWait(allowed.retryAfterMs)}.` };
  }
  await recordVerifyRequest(ip, user.email);

  await sendVerificationEmail(user.id, user.email);
  return { sent: true };
}
