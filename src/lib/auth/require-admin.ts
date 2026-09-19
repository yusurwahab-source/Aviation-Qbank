import "server-only";

import { notFound } from "next/navigation";

import { getUserRole } from "@/db/users";
import { getCurrentUser } from "@/lib/auth/session";
import { isOwner } from "@/lib/auth/owner";
import { envValue } from "@/lib/env";

/**
 * The gate in front of everything under `/admin`.
 *
 * Two ways in, either sufficient: the site owner (the same `OWNER_EMAIL`
 * check `/owner` uses — the owner should never be locked out of a smaller
 * area than the one they already have full access to), or an account with
 * `role: "admin"`. There is no UI yet to promote an account to that role —
 * see the README section this task adds — so today this is reached the
 * same way `/owner` always was, plus a real path for a second person once
 * one is needed without minting them a second owner email.
 *
 * `notFound()` rather than a redirect, for the same reason `requireOwner`
 * gives: a redirect to `/login` would confirm the path exists to someone
 * it does not exist for.
 */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const user = await getCurrentUser();
  if (!user) notFound();

  if (isOwner(user.email, envValue("OWNER_EMAIL"))) return user;

  const role = await getUserRole(user.id);
  if (role !== "admin") notFound();

  return user;
}
