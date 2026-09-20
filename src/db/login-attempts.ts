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

/**
 * Reset requests are counted under their own keys.
 *
 * Separate from the log-in keys on purpose: the two count different things
 * with different limits, and sharing a key would let failed log ins use up
 * somebody's ability to ask for a reset — locking them out of the one route
 * back in, which is the opposite of what a reset is for.
 */
export function resetIpKey(ip: string): string {
  return `reset-ip:${ip}`;
}

export function resetEmailKey(email: string): string {
  return `reset-email:${email}`;
}

/**
 * Gift code redemption attempts get their own key prefixes too, for the same
 * reason reset requests do: sharing a bucket with log-in failures would let
 * one kind of activity use up another's allowance.
 */
export function redeemUserKey(userId: string): string {
  return `redeem-user:${userId}`;
}

export function redeemIpKey(ip: string): string {
  return `redeem-ip:${ip}`;
}

/**
 * Signed-out answers get their own key prefix, for the same reason reset
 * requests and redemptions do: what is counted here is a *request*, not a
 * failure, and sharing a bucket with log-in failures would let one kind of
 * activity spend another's allowance.
 */
export function previewIpKey(ip: string): string {
  return `preview-ip:${ip}`;
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

/**
 * Whether a password reset may be requested for this address.
 *
 * Counted whether or not an account exists, for the same reason log in is:
 * a limit that only applied to real accounts would make being refused a way
 * to discover which addresses are registered.
 */
export async function checkResetAllowed(ip: string, email: string): Promise<RateLimitDecision> {
  const now = new Date();
  const windows: KeyWindow[] = [
    { key: resetIpKey(ip), since: new Date(now.getTime() - RATE_LIMIT_RULES.resetPerIp.windowMs) },
    {
      key: resetEmailKey(email),
      since: new Date(now.getTime() - RATE_LIMIT_RULES.resetPerEmail.windowMs),
    },
  ];

  const counts = await countRecentFailures(windows);
  const forIp = counts.get(windows[0].key) ?? { failures: 0, oldest: null };
  const forEmail = counts.get(windows[1].key) ?? { failures: 0, oldest: null };

  return combine([
    decide(RATE_LIMIT_RULES.resetPerIp, forIp.failures, forIp.oldest, now),
    decide(RATE_LIMIT_RULES.resetPerEmail, forEmail.failures, forEmail.oldest, now),
  ]);
}

/**
 * Whether a gift code may be redeemed by this user from this address right
 * now. Checked before touching the code at all — a code claim does real
 * work inside a transaction with a row lock, so refusing early here is what
 * stops a flood of guesses reaching that far.
 */
export async function checkRedeemAllowed(ip: string, userId: string): Promise<RateLimitDecision> {
  const now = new Date();
  const windows: KeyWindow[] = [
    { key: redeemIpKey(ip), since: new Date(now.getTime() - RATE_LIMIT_RULES.redeemPerIp.windowMs) },
    {
      key: redeemUserKey(userId),
      since: new Date(now.getTime() - RATE_LIMIT_RULES.redeemPerUser.windowMs),
    },
  ];

  const counts = await countRecentFailures(windows);
  const forIp = counts.get(windows[0].key) ?? { failures: 0, oldest: null };
  const forUser = counts.get(windows[1].key) ?? { failures: 0, oldest: null };

  return combine([
    decide(RATE_LIMIT_RULES.redeemPerIp, forIp.failures, forIp.oldest, now),
    decide(RATE_LIMIT_RULES.redeemPerUser, forUser.failures, forUser.oldest, now),
  ]);
}

/** Records one failed redemption attempt against both keys. */
export async function recordFailedRedeem(ip: string, userId: string): Promise<void> {
  await getDb()
    .insert(loginAttempts)
    .values([{ key: redeemIpKey(ip) }, { key: redeemUserKey(userId) }]);
}

/**
 * Clears this user's redemption failures after a successful one. The IP key
 * is left alone, the same reasoning `clearFailedLogins` gives for its own
 * address key: one success should not reset the broader brake for whoever
 * else is behind the same address.
 */
export async function clearFailedRedeems(userId: string): Promise<void> {
  await getDb().delete(loginAttempts).where(eq(loginAttempts.key, redeemUserKey(userId)));
}

/**
 * Records one reset request against both keys.
 *
 * Every request, not only the ones that found an account — otherwise the
 * counter itself would reveal which addresses are registered, by refusing
 * sooner for those.
 */
export async function recordResetRequest(ip: string, email: string): Promise<void> {
  await getDb()
    .insert(loginAttempts)
    .values([{ key: resetIpKey(ip) }, { key: resetEmailKey(email) }]);
}

/**
 * Clears an address's log-in failures after a successful password reset.
 *
 * Reaching a password through the inbox proves as much as knowing the old
 * one did, so being locked out by failed guesses must not survive it — that
 * lock is precisely what someone who has forgotten their password will have
 * hit on the way here. The IP key is left alone, exactly as after a log in.
 */
export async function clearFailedLoginsAfterReset(email: string): Promise<void> {
  await getDb().delete(loginAttempts).where(eq(loginAttempts.key, emailKey(email)));
}

/**
 * Whether a signed-out caller from this address may be given another
 * answer.
 *
 * Checked *before* the answer key is read and before anything is written,
 * the same ordering log in uses for password verification: the point is to
 * refuse early, not to do the work and then decline to show it.
 *
 * Unlike the account rules, nothing clears this on success — every
 * signed-out answer counts, because every signed-out answer is the thing
 * being limited.
 */
export async function checkPreviewAllowed(ip: string): Promise<RateLimitDecision> {
  const now = new Date();
  const key = previewIpKey(ip);
  const since = new Date(now.getTime() - RATE_LIMIT_RULES.previewPerIp.windowMs);

  const counts = await countRecentFailures([{ key, since }]);
  const forIp = counts.get(key) ?? { failures: 0, oldest: null };

  return decide(RATE_LIMIT_RULES.previewPerIp, forIp.failures, forIp.oldest, now);
}

/** Records one signed-out answer against the address that asked for it. */
export async function recordPreviewRequest(ip: string): Promise<void> {
  await getDb().insert(loginAttempts).values({ key: previewIpKey(ip) });
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
    ...Object.values(RATE_LIMIT_RULES).map((rule) => rule.windowMs),
  );

  const deleted = await getDb()
    .delete(loginAttempts)
    .where(lt(loginAttempts.attemptedAt, new Date(Date.now() - longestWindow)))
    .returning({ id: loginAttempts.id });

  return deleted.length;
}
