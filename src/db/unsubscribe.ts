import "server-only";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { broadcastDeliveries, users } from "@/db/schema";

/**
 * The public half of broadcasts: what an unsubscribe link and the account
 * page's own switch can do. Scoped to one token or one `userId` — nothing here
 * reads another account's data, which is why it is not in `db/broadcasts.ts`.
 */

export function hashUnsubscribeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Whose email a token came from, without changing anything. */
export async function findUnsubscribeToken(
  token: string,
): Promise<{ userId: string; email: string; alreadyOptedOut: boolean } | null> {
  if (token === "") return null;

  const [row] = await getDb()
    .select({
      userId: users.id,
      email: users.email,
      optedOutAt: users.broadcastOptOutAt,
    })
    .from(broadcastDeliveries)
    .innerJoin(users, eq(users.id, broadcastDeliveries.userId))
    .where(eq(broadcastDeliveries.unsubscribeTokenHash, hashUnsubscribeToken(token)))
    .limit(1);

  return row ? { userId: row.userId, email: row.email, alreadyOptedOut: row.optedOutAt !== null } : null;
}

/** Opts the account behind a token out of broadcasts. Idempotent. */
export async function optOutWithToken(token: string): Promise<boolean> {
  const found = await findUnsubscribeToken(token);
  if (!found) return false;
  await setBroadcastOptOut(found.userId, true);
  return true;
}

export async function setBroadcastOptOut(userId: string, optedOut: boolean): Promise<void> {
  await getDb()
    .update(users)
    .set({ broadcastOptOutAt: optedOut ? new Date() : null, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function isOptedOut(userId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ at: users.broadcastOptOutAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.at != null;
}
