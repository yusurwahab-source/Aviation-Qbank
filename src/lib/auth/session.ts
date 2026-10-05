import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";

import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import { SESSION_COOKIE } from "@/lib/auth/cookie-names";

/**
 * Logged-in sessions.
 *
 * The cookie holds a long random token. The database holds only its SHA-256, so
 * reading the sessions table gives an attacker nothing they can use. Logging out
 * deletes the row, which revokes the session everywhere at once.
 */

/** Re-exported so the many callers that import it from here keep working;
 * the name itself lives in `cookie-names.ts`, which `middleware.ts` can
 * also import. */
export { SESSION_COOKIE };

/** How long a session lasts without being used. */
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * When a session is more than halfway through its life, using it extends it.
 * That keeps a regular user logged in without giving every session an
 * unlimited lifetime.
 */
const RENEW_AFTER_MS = SESSION_DURATION_MS / 2;

export type SessionUser = {
  id: string;
  email: string;
  /** Whether the inbox has been proved. Never blocks practice. */
  emailVerified: boolean;
};

/** SHA-256 is right here: the token is already 256 bits of randomness, so there
 * is nothing to brute force and no need for a slow hash. */
function tokenToId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Starts a session and sets the cookie. Returns the token only for tests —
 * normal callers just need the cookie to have been set.
 */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await getDb().insert(sessions).values({ id: tokenToId(token), userId, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true, // JavaScript on the page can never read it
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // not sent from other sites, which blocks CSRF
    path: "/",
    expires: expiresAt,
  });

  return token;
}

/**
 * Reads the current user, or null when signed out.
 *
 * Wrapped in React's `cache` so several components on one page share a single
 * database lookup per request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const sessionId = tokenToId(token);

  const [row] = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      id: users.id,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    // An expired row is treated as absent even if the sweep has not run yet.
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row) return null;

  // Sliding expiry. The cookie itself is refreshed by the caller that can set
  // cookies; reading alone must not fail if it cannot.
  if (row.expiresAt.getTime() - Date.now() < RENEW_AFTER_MS) {
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, row.sessionId));
  }

  return { id: row.id, email: row.email, emailVerified: row.emailVerifiedAt !== null };
});

/** Ends the current session: deletes the row and clears the cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await getDb().delete(sessions).where(eq(sessions.id, tokenToId(token)));
  }

  cookieStore.delete(SESSION_COOKIE);
}

/** Ends every session for a user, e.g. after a password change. */
export async function destroyAllSessions(userId: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Deletes expired rows. Nothing depends on this for correctness — `getCurrentUser`
 * already ignores expired sessions — it only stops the table growing forever.
 */
export async function sweepExpiredSessions(): Promise<number> {
  const deleted = await getDb()
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });
  return deleted.length;
}

/**
 * Compares two secrets without leaking how much of them matched.
 * Exported for reuse; `verifyPassword` does its own constant-time compare.
 */
export function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
