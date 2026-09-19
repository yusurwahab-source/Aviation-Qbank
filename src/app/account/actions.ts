"use server";

import { redirect } from "next/navigation";

import { deleteUser, getPasswordHash } from "@/db/users";
import { destroySession, getCurrentUser } from "@/lib/auth/session";
import { unmatchableHash, verifyPassword } from "@/lib/password";

export type DeleteAccountState = { error?: string };

/**
 * Deletes the signed-in account and everything that belongs only to it —
 * see `deleteUser` in `db/users.ts` for what cascades.
 *
 * The typed password is re-checked first, the same reasoning a reset
 * re-checks the account's failed log ins rather than trusting a click
 * alone: this is the one action in the whole application that cannot be
 * undone by anyone, including the person who asked for it, so it is held
 * to the same standard as signing in — hashed against `unmatchableHash()`
 * even when something has already gone wrong, so a missing row never makes
 * this path faster than a real one.
 */
export async function deleteAccount(
  _previous: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const password = String(formData.get("password") ?? "");
  const passwordHash = (await getPasswordHash(user.id)) ?? unmatchableHash();
  const isValid = await verifyPassword(password, passwordHash);

  if (!isValid) {
    return { error: "That password is incorrect." };
  }

  await deleteUser(user.id);
  await destroySession();
  redirect("/");
}
