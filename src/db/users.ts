import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";

/** Reads and writes for accounts. Emails arrive here already normalised. */

export type UserWithPassword = {
  id: string;
  email: string;
  passwordHash: string;
};

export async function findUserByEmail(email: string): Promise<UserWithPassword | null> {
  const [row] = await getDb()
    .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return row ?? null;
}

/**
 * Creates an account.
 *
 * Returns null when the email is already taken. The unique index is what
 * decides that, not a prior lookup: two sign-ups for the same address at the
 * same moment would both pass a check-then-insert, and only one can win here.
 */
export async function createUser(
  email: string,
  passwordHash: string,
): Promise<{ id: string; email: string } | null> {
  const [row] = await getDb()
    .insert(users)
    .values({ email, passwordHash })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id, email: users.email });

  return row ?? null;
}

/** Replaces a stored password hash, e.g. to upgrade its cost after a login. */
export async function updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
  await getDb()
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/** The config-driven tier from `src/config/plans.ts` — see the note on the
 * `plan` column in `schema.ts` for how this relates to the Phase 6 Stripe
 * subscription. Read alongside `getSubscription`, the same two-query shape
 * every caller of `isPremiumUser` already follows. */
export async function getUserPlanState(
  userId: string,
): Promise<{ plan: "free" | "premium"; planExpiresAt: Date | null }> {
  const [row] = await getDb()
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? { plan: "free", planExpiresAt: null };
}

/** Whether this account has the `admin` role — one half of `requireAdmin`'s
 * check, alongside `isOwner`. */
export async function getUserRole(userId: string): Promise<"student" | "admin"> {
  const [row] = await getDb()
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.role ?? "student";
}

/**
 * Deletes an account and everything that belongs only to it.
 *
 * Every table that references `users.id` does so with `onDelete: "cascade"`
 * except `question_reports`, which sets the reference null instead — a
 * report about a bad question stays useful to `/admin` after the reporter's
 * account is gone, the same reasoning `question_reports.userId` being
 * nullable already carries. One statement is enough: the database does the
 * rest.
 */
export async function deleteUser(userId: string): Promise<void> {
  await getDb().delete(users).where(eq(users.id, userId));
}
