import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";

import { getDb } from "@/db";
import { emailVerificationTokens, users } from "@/db/schema";
import {
  verificationExpiryFrom,
  verificationTokenState,
  type VerificationTokenState,
} from "@/lib/auth/verification-policy";

/**
 * Issuing and spending email verification links.
 *
 * The same shape as `password-reset.ts` and for the same reasons: the token is
 * 256 bits of randomness, only its SHA-256 is stored, an account has at most
 * one live link, and spending one is a single atomic update.
 */

function tokenToId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a link for a user, retiring any they already had, so a link found
 * later in an old email is already dead. Returns the raw token, which exists
 * in memory only long enough to build the email.
 */
export async function issueVerificationToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const db = getDb();

  await db.transaction(async (tx) => {
    await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
    await tx.insert(emailVerificationTokens).values({
      id: tokenToId(token),
      userId,
      expiresAt: verificationExpiryFrom(new Date()),
    });
  });

  return token;
}

export type VerificationLookup =
  | { state: "valid"; userId: string; email: string }
  | { state: Exclude<VerificationTokenState, "valid"> };

/** Looks a link up without spending it, so opening the email does not burn it. */
export async function findVerificationToken(token: string): Promise<VerificationLookup> {
  const [row] = await getDb()
    .select({
      userId: emailVerificationTokens.userId,
      email: users.email,
      expiresAt: emailVerificationTokens.expiresAt,
      usedAt: emailVerificationTokens.usedAt,
    })
    .from(emailVerificationTokens)
    .innerJoin(users, eq(users.id, emailVerificationTokens.userId))
    .where(eq(emailVerificationTokens.id, tokenToId(token)))
    .limit(1);

  const state = verificationTokenState(row ?? null);
  if (state !== "valid" || !row) return { state } as VerificationLookup;

  return { state: "valid", userId: row.userId, email: row.email };
}

/**
 * Spends a link and marks the address verified, in one transaction.
 *
 * `usedAt is null` and `expiresAt > now` sit in the update's own `where`, so
 * two submissions racing cannot both win and an expired link can never verify
 * anybody. When nothing was updated the row is read back to say why.
 */
export async function consumeVerificationToken(
  token: string,
): Promise<{ ok: true; userId: string } | { ok: false; state: Exclude<VerificationTokenState, "valid"> }> {
  const id = tokenToId(token);

  return getDb().transaction(async (tx) => {
    const now = new Date();
    const [spent] = await tx
      .update(emailVerificationTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(emailVerificationTokens.id, id),
          isNull(emailVerificationTokens.usedAt),
          gt(emailVerificationTokens.expiresAt, now),
        ),
      )
      .returning({ userId: emailVerificationTokens.userId });

    if (!spent) {
      const [existing] = await tx
        .select({
          expiresAt: emailVerificationTokens.expiresAt,
          usedAt: emailVerificationTokens.usedAt,
        })
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.id, id))
        .limit(1);

      const state = verificationTokenState(existing ?? null, now);
      return { ok: false as const, state: state === "valid" ? "unknown" : state };
    }

    await tx
      .update(users)
      .set({ emailVerifiedAt: now, updatedAt: now })
      .where(eq(users.id, spent.userId));

    return { ok: true as const, userId: spent.userId };
  });
}

/** Deletes links that have aged out. Housekeeping only. */
export async function sweepExpiredVerificationTokens(): Promise<number> {
  const deleted = await getDb()
    .delete(emailVerificationTokens)
    .where(lt(emailVerificationTokens.expiresAt, new Date()))
    .returning({ id: emailVerificationTokens.id });
  return deleted.length;
}
