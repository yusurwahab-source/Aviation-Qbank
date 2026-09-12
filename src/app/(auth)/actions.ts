"use server";

import { redirect } from "next/navigation";

import {
  checkLoginAllowed,
  clearFailedLogins,
  recordFailedLogin,
} from "@/db/login-attempts";
import { createUser, findUserByEmail, updatePasswordHash } from "@/db/users";
import { getClientIp } from "@/lib/auth/client-ip";
import { logInSchema, signUpSchema } from "@/lib/auth/credentials";
import { describeWait } from "@/lib/auth/rate-limit-policy";
import { createSession, destroySession } from "@/lib/auth/session";
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
