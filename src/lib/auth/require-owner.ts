import "server-only";

import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { isOwner } from "@/lib/auth/owner";
import { envValue } from "@/lib/env";

/**
 * The one gate in front of everything under `/owner`.
 *
 * Every page and every action in that area calls this first — an action is
 * its own reachable entry point, so a page having checked does not cover
 * the action it renders. One function rather than the check written out
 * five times: the version of this that gets forgotten somewhere is the
 * version that leaks the whole site's data.
 *
 * `notFound()` rather than a redirect, for the reason given on
 * `/owner/gift-codes`: a redirect to `/login` would confirm the path exists
 * to someone it does not exist for.
 */
export async function requireOwner(): Promise<{ id: string; email: string }> {
  const user = await getCurrentUser();
  if (!user || !isOwner(user.email, envValue("OWNER_EMAIL"))) notFound();
  return user;
}
