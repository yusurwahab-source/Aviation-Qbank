import "server-only";

import { and, count, eq, gte, lt, min, or } from "drizzle-orm";

import { getDb } from "@/db";
import { loginAttempts } from "@/db/schema";
import {
  RATE_LIMIT_RULES,
  combine,
  decide,
  type RateLimitDecision,
} from "@/lib/auth/rate-limit-policy";

/**
 * The database side of log in rate limiting.
 *
 * The policy that decides is pure and lives in `lib/auth/rate-limit-policy.ts`;
 * this file only counts rows and writes them.
 */

export function ipKey(ip: string): string {
  return `ip:${ip}`;
}

export function emailKey(email: string): string {
  return `email:${email}`;
}

type KeyWindow = { key: string; since: Date };

/**
 * Counts recent failures for several keys in one round trip, rather than one
 * query per key. Log in is on the hot path for an attacker, so it should not
 * cost more queries than it has to.
 */
async function countRecentFailures(
  windows: KeyWindow[],
): Promise<Map<string, { failures: number; oldest: Date | null }>> {
  const db = getDb();

  const rows = await db
    .select({
      key: loginAttempts.key,
      failures: count(),
      oldest: min(loginAttempts.attemptedAt),
    })
    .from(loginAttempts)
    .where(
      or(
        ...windows.map((w) =>
          and(eq(loginAttempts.key, w.key), gte(loginAttempts.attemptedAt, w.since)),
        ),
      ),
    )
    .groupBy(loginAttempts.key);

  const byKey = new Map<string, { failures: number; oldest: Date | null }>();
  for (const row of rows) {
    byKey.set(row.key, {
      failures: Number(row.failures),
      // Drizzle returns min() as a string for timestamp columns on some drivers.
      oldest: row.oldest ? new Date(row.oldest) : null,
    });
  }
  return byKey;
}

/**
 * Whether this log in attempt may proceed.
 *
 * Call it *before* verifying the password. Each verification costs about half a
 * second of CPU and 128 MB by design, so checking first is what stops a flood of
 * guesses exhausting the server — the limit protects the machine as much as the
 * accounts.
 */
export async function checkLoginAllowed(ip: string, email: string): Promise<RateLimitDecision> {
  const now = new Date();
  const windows: KeyWindow[] = [
    { key: ipKey(ip), since: new Date(now.getTime() - RATE_LIMIT_RULES.perIp.windowMs) },
    { key: emailKey(email), since: new Date(now.getTime() - RATE_LIMIT_RULES.perEmail.windowMs) },
  ];

  const counts = await countRecentFailures(windows);
  const forIp = counts.get(windows[0].key) ?? { failures: 0, oldest: null };
  const forEmail = counts.get(windows[1].key) ?? { failures: 0, oldest: null };

  return combine([
    decide(RATE_LIMIT_RULES.perIp, forIp.failures, forIp.oldest, now),
    decide(RATE_LIMIT_RULES.perEmail, forEmail.failures, forEmail.oldest, now),
  ]);
}

/** Records one failed attempt against both keys. */
export async function recordFailedLogin(ip: string, email: string): Promise<void> {
  await getDb()
    .insert(loginAttempts)
    .values([{ key: ipKey(ip) }, { key: emailKey(email) }]);
}

/**
 * Clears the email's failures after a successful log in.
 *
 * The address key only — the address proved it belongs to someone who knows the
 * password. The IP key is left alone so that one correct log in cannot be used
 * to reset the broader brake and carry on guessing other accounts.
 */
export async function clearFailedLogins(email: string): Promise<void> {
  await getDb().delete(loginAttempts).where(eq(loginAttempts.key, emailKey(email)));
}

/**
 * Deletes rows older than every window. Housekeeping only: counting is already
 * bounded by time, so stale rows are ignored rather than wrong.
 */
export async function sweepLoginAttempts(): Promise<number> {
  const longestWindow = Math.max(
    RATE_LIMIT_RULES.perIp.windowMs,
    RATE_LIMIT_RULES.perEmail.windowMs,
  );

  const deleted = await getDb()
    .delete(loginAttempts)
    .where(lt(loginAttempts.attemptedAt, new Date(Date.now() - longestWindow)))
    .returning({ id: loginAttempts.id });

  return deleted.length;
}
