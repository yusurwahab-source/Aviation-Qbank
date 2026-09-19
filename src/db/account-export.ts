import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  attempts,
  questionFlags,
  questionNotes,
  subscriptions,
  testSessions,
  users,
} from "@/db/schema";

/**
 * Everything stored about one account, in the shape `/account/export`
 * downloads as a file. Every table here is scoped to `userId` — the same
 * rule `reports.ts` states for exactly the same reason, just serving the
 * account's owner instead of a report on screen.
 *
 * Plain objects, not the Drizzle row types: this crosses into a downloaded
 * file, so its shape is a promise to whoever reads that file back, not an
 * implementation detail of this table.
 */
export async function exportAccountData(userId: string) {
  const db = getDb();

  const [[account], subscription, sessions, answers, flags, notes] = await Promise.all([
    db
      .select({
        email: users.email,
        plan: users.plan,
        planExpiresAt: users.planExpiresAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db.select().from(subscriptions).where(eq(subscriptions.userId, userId)),
    db.select().from(testSessions).where(eq(testSessions.userId, userId)),
    db.select().from(attempts).where(eq(attempts.userId, userId)),
    db.select().from(questionFlags).where(eq(questionFlags.userId, userId)),
    db.select().from(questionNotes).where(eq(questionNotes.userId, userId)),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account,
    subscription: subscription[0] ?? null,
    testSessions: sessions,
    attempts: answers,
    flaggedQuestions: flags,
    notes,
  };
}
