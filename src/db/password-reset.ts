import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, lt } from "drizzle-orm";

import { getDb } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { resetExpiryFrom, resetTokenState, type ResetTokenState } from "@/lib/auth/reset-policy";

/**
 * Issuing and spending password reset links.
 *
 * The token in the link is 256 bits of randomness. Only its SHA-256 is
 * stored, exactly as with session cookies — SHA-256 and not scrypt because
 * there is nothing here to brute force: the secret is already full-entropy
 * random, not something a person chose.
 */

function tokenToId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a link for a user, retiring any they already had.
 *
 * Retiring the old ones is the useful behaviour rather than the tidy one. Ask
 * for a second link because the first did not arrive, and only the newest
 * works — so a link found later in an old email is already dead, and the
 * number of live keys to one account is always at most one.
 *
 * Returns the raw token, which exists in memory for exactly as long as it
 * takes to build the email. It is never stored and never logged.
 */
export async function issueResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const db = getDb();

  await db.transaction(async (tx) => {
    // Deleted, not marked used: these were never spent, and keeping them
    // would only make "used" ambiguous on the screen that reports it.
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));

    await tx.insert(passwordResetTokens).values({
      id: tokenToId(token),
      userId,
      expiresAt: resetExpiryFrom(new Date()),
    });
  });

  return token;
}

export type ResetLookup =
  | { state: "valid"; userId: string; email: string }
  | { state: Exclude<ResetTokenState, "valid"> };

/**
 * Looks a link up without spending it, for rendering the form.
 *
 * Separate from `consumeResetToken` on purpose: arriving at the page must not
 * burn the link, or a student who opens the email, sees the form and then
 * reloads it would find their own link already used.
 */
export async function findResetToken(token: string): Promise<ResetLookup> {
  const [row] = await getDb()
    .select({
      userId: passwordResetTokens.userId,
      email: users.email,
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
    })
    .from(passwordResetTokens)
    .innerJoin(users, eq(users.id, passwordResetTokens.userId))
    .where(eq(passwordResetTokens.id, tokenToId(token)))
    .limit(1);

  const state = resetTokenState(row ?? null);
  if (state !== "valid" || !row) return { state } as ResetLookup;

  return { state: "valid", userId: row.userId, email: row.email };
}

/**
 * Spends a link and sets the new password, in one transaction.
 *
 * The `usedAt is null` in the update's own `where` is what makes this safe
 * against two submissions racing: the second finds no row to update, returns
 * nothing, and is refused. Checking first and updating after would let both
 * through.
 *
 * Sessions are not touched here — that is the caller's job, because revoking
 * them needs the cookie store. See the note in `resetPassword`.
 */
export async function consumeResetToken(
  token: string,
  passwordHash: string,
): Promise<{ ok: true; userId: string } | { ok: false; state: Exclude<ResetTokenState, "valid"> }> {
  const db = getDb();
  const id = tokenToId(token);

  return db.transaction(async (tx) => {
    const [spent] = await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.id, id), isNull(passwordResetTokens.usedAt)))
      .returning({
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
      });

    if (!spent) {
      // Either there is no such row, or somebody else just spent it. Read it
      // back so the screen can say which.
      const [existing] = await tx
        .select({
          expiresAt: passwordResetTokens.expiresAt,
          usedAt: passwordResetTokens.usedAt,
        })
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.id, id))
        .limit(1);

      const state = resetTokenState(existing ?? null);
      return { ok: false, state: state === "valid" ? "unknown" : state } as const;
    }

    // Expiry is checked after the row is claimed rather than before. Claiming
    // first means an expired link is spent by the attempt, so it cannot be
    // retried in the hope of a different answer.
    if (spent.expiresAt.getTime() <= Date.now()) {
      return { ok: false, state: "expired" } as const;
    }

    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, spent.userId));

    return { ok: true, userId: spent.userId } as const;
  });
}

/**
 * Deletes links that have aged out. Nothing depends on this for correctness —
 * `resetTokenState` already refuses an expired row — it only stops the table
 * growing. Same story as `sweepExpiredSessions`, and still nothing calls it.
 */
export async function sweepExpiredResetTokens(): Promise<number> {
  const deleted = await getDb()
    .delete(passwordResetTokens)
    .where(lt(passwordResetTokens.expiresAt, new Date()))
    .returning({ id: passwordResetTokens.id });
  return deleted.length;
}
