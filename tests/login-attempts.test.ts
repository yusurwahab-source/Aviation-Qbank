import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterEach, afterAll, beforeAll, describe, expect, it } from "vitest";

import { loginAttempts } from "@/db/schema";
import { RATE_LIMIT_RULES } from "@/lib/auth/rate-limit-policy";

/**
 * Integration tests for the log in limiter's counting.
 *
 * The decision itself is covered exhaustively by the pure policy tests; these
 * check that the right rows are written, counted and cleared against a real
 * database. They skip when DATABASE_URL is unset; CI provides one.
 */

const connectionString = process.env.DATABASE_URL;
const describeWithDb = connectionString ? describe : describe.skip;

describeWithDb("login attempt counting", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;
  let limiter: typeof import("@/db/login-attempts");

  // Unique per run so tests never collide with each other or with real rows.
  let ip: string;
  let email: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString, max: 1 });
    db = drizzle(pool);
    limiter = await import("@/db/login-attempts");
  });

  afterEach(async () => {
    await db
      .delete(loginAttempts)
      .where(inArray(loginAttempts.key, [limiter.ipKey(ip), limiter.emailKey(email)]));
  });

  afterAll(async () => {
    await pool.end();
  });

  // Fresh identifiers for every test.
  beforeAll(() => {
    ip = `203.0.113.${Math.floor(Math.random() * 254) + 1}-${randomUUID().slice(0, 8)}`;
    email = `limiter-${randomUUID()}@example.invalid`;
  });

  async function failTimes(n: number) {
    for (let i = 0; i < n; i++) await limiter.recordFailedLogin(ip, email);
  }

  it("allows an attempt when nothing has failed yet", async () => {
    const decision = await limiter.checkLoginAllowed(ip, email);
    expect(decision.allowed).toBe(true);
  });

  it("records a failure against both the address and the email", async () => {
    await limiter.recordFailedLogin(ip, email);

    const rows = await db
      .select()
      .from(loginAttempts)
      .where(inArray(loginAttempts.key, [limiter.ipKey(ip), limiter.emailKey(email)]));

    expect(rows.map((r) => r.key).sort()).toEqual(
      [limiter.emailKey(email), limiter.ipKey(ip)].sort(),
    );
  });

  it("still allows attempts up to the email limit", async () => {
    await failTimes(RATE_LIMIT_RULES.perEmail.maxFailures - 1);
    expect((await limiter.checkLoginAllowed(ip, email)).allowed).toBe(true);
  });

  it("blocks once the email limit is reached, and says how long to wait", async () => {
    await failTimes(RATE_LIMIT_RULES.perEmail.maxFailures);

    const decision = await limiter.checkLoginAllowed(ip, email);
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.retryAfterMs).toBeGreaterThan(0);
      expect(decision.retryAfterMs).toBeLessThanOrEqual(RATE_LIMIT_RULES.perEmail.windowMs);
    }
  });

  it("counts an email that has no account at all", async () => {
    // The whole point: behaviour must not differ between a registered address
    // and an unregistered one, or the difference becomes a way to find accounts.
    const unknown = `never-registered-${randomUUID()}@example.invalid`;
    for (let i = 0; i < RATE_LIMIT_RULES.perEmail.maxFailures; i++) {
      await limiter.recordFailedLogin(ip, unknown);
    }

    const decision = await limiter.checkLoginAllowed(ip, unknown);
    expect(decision.allowed).toBe(false);

    await db.delete(loginAttempts).where(eq(loginAttempts.key, limiter.emailKey(unknown)));
  });

  it("a successful log in clears that email, so a mistyped password is forgiven", async () => {
    await failTimes(RATE_LIMIT_RULES.perEmail.maxFailures);
    expect((await limiter.checkLoginAllowed(ip, email)).allowed).toBe(false);

    await limiter.clearFailedLogins(email);

    const remaining = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.key, limiter.emailKey(email)));
    expect(remaining).toHaveLength(0);
  });

  it("clearing one email leaves the address count alone", async () => {
    // Otherwise one correct log in would reset the broad brake and let the same
    // machine carry on guessing other accounts.
    await failTimes(3);
    await limiter.clearFailedLogins(email);

    const ipRows = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.key, limiter.ipKey(ip)));
    expect(ipRows).toHaveLength(3);
  });

  it("ignores failures that have aged out of the window", async () => {
    await failTimes(RATE_LIMIT_RULES.perEmail.maxFailures);
    expect((await limiter.checkLoginAllowed(ip, email)).allowed).toBe(false);

    // Push every row back beyond the window, as the passage of time would.
    const past = new Date(Date.now() - RATE_LIMIT_RULES.perIp.windowMs - 60_000);
    await db
      .update(loginAttempts)
      .set({ attemptedAt: past })
      .where(inArray(loginAttempts.key, [limiter.ipKey(ip), limiter.emailKey(email)]));

    expect((await limiter.checkLoginAllowed(ip, email)).allowed).toBe(true);
  });

  it("sweeps rows that have aged out", async () => {
    await failTimes(2);
    const past = new Date(Date.now() - RATE_LIMIT_RULES.perIp.windowMs - 60_000);
    await db
      .update(loginAttempts)
      .set({ attemptedAt: past })
      .where(inArray(loginAttempts.key, [limiter.ipKey(ip), limiter.emailKey(email)]));

    const deleted = await limiter.sweepLoginAttempts();
    expect(deleted).toBeGreaterThanOrEqual(4);
  });
});
