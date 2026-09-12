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
