import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb } from "@/db";
import {
  consumeResetToken,
  findResetToken,
  issueResetToken,
  sweepExpiredResetTokens,
} from "@/db/password-reset";
import { passwordResetTokens, users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";

/**
 * Reset links, against a real database.
 *
 * The rules themselves are unit tested in `reset-policy.test.ts`. What is
 * checked here is that the queries actually enforce them — particularly the
 * single-use property, which lives in a `where` clause rather than in any
 * pure function, and which is the whole reason a stolen link is not a
 * permanent key.
 */

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("password reset tokens", () => {
  let userId: string;
  let email: string;
  const created: string[] = [];

  async function makeUser(): Promise<{ id: string; email: string }> {
    const address = `reset-${randomUUID()}@example.invalid`;
    const [row] = await getDb()
      .insert(users)
      .values({ email: address, passwordHash: await hashPassword("the-original-password") })
      .returning({ id: users.id, email: users.email });
    created.push(row.id);
    return row;
  }

  beforeAll(async () => {
    const user = await makeUser();
    userId = user.id;
    email = user.email;
  });

  afterAll(async () => {
    for (const id of created) {
      await getDb().delete(users).where(eq(users.id, id));
    }
  });

  it("stores only the hash of the token, never the token", async () => {
    // The same property as session cookies: reading this table must not give
    // anyone a working link.
    const token = await issueResetToken(userId);

    const rows = await getDb()
      .select({ id: passwordResetTokens.id })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));

    expect(rows).toHaveLength(1);
    expect(rows[0].id).not.toBe(token);
    expect(rows[0].id).toBe(createHash("sha256").update(token).digest("hex"));
  });

  it("finds a fresh link without spending it", async () => {
    // Opening the email must not burn the link — some mail clients prefetch
    // links, and a reload would otherwise be fatal.
    const token = await issueResetToken(userId);

    expect(await findResetToken(token)).toEqual({ state: "valid", userId, email });
    expect(await findResetToken(token)).toEqual({ state: "valid", userId, email });
  });

  it("refuses a token that was never issued", async () => {
    expect(await findResetToken("not-a-real-token")).toEqual({ state: "unknown" });
  });

  it("sets the password and spends the link", async () => {
    const token = await issueResetToken(userId);
    const newHash = await hashPassword("a-brand-new-password");

    const outcome = await consumeResetToken(token, newHash);
    expect(outcome).toEqual({ ok: true, userId });

    const [row] = await getDb()
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId));
    expect(await verifyPassword("a-brand-new-password", row.passwordHash)).toBe(true);
    expect(await verifyPassword("the-original-password", row.passwordHash)).toBe(false);
  });

  it("refuses the same link a second time", async () => {
    // The property that makes a link a one-time key rather than a permanent
    // one. It is enforced by `usedAt is null` inside the update's own where
    // clause, not by a check beforehand.
    const token = await issueResetToken(userId);
    expect((await consumeResetToken(token, await hashPassword("first-use-wins"))).ok).toBe(true);

    const second = await consumeResetToken(token, await hashPassword("second-use-loses"));
    expect(second).toEqual({ ok: false, state: "used" });

    const [row] = await getDb()
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId));
    expect(await verifyPassword("first-use-wins", row.passwordHash)).toBe(true);
    expect(await verifyPassword("second-use-loses", row.passwordHash)).toBe(false);
  });

  it("lets only one of two simultaneous submissions through", async () => {
    // The race the atomic update exists for: check-then-update would let
    // both of these win.
    const token = await issueResetToken(userId);

    const [a, b] = await Promise.all([
      consumeResetToken(token, await hashPassword("racer-a-password")),
      consumeResetToken(token, await hashPassword("racer-b-password")),
    ]);

    const winners = [a, b].filter((outcome) => outcome.ok);
    expect(winners).toHaveLength(1);
  });

  it("issuing a new link retires the old one", async () => {
    // So a link found later in an older email is already dead, and there is
    // never more than one live key to an account.
    const first = await issueResetToken(userId);
    const second = await issueResetToken(userId);

    expect(await findResetToken(first)).toEqual({ state: "unknown" });
    expect((await findResetToken(second)).state).toBe("valid");
  });

  it("refuses a link whose hour has passed, and spends it in the attempt", async () => {
    const token = await issueResetToken(userId);
    // Wind the row's expiry back rather than waiting an hour.
    await getDb()
      .update(passwordResetTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(passwordResetTokens.userId, userId));

    expect((await findResetToken(token)).state).toBe("expired");

    const outcome = await consumeResetToken(token, await hashPassword("too-late-password"));
    expect(outcome).toEqual({ ok: false, state: "expired" });

    // Claimed on the way past, so retrying cannot get a different answer.
    const retry = await consumeResetToken(token, await hashPassword("too-late-password"));
    expect(retry).toEqual({ ok: false, state: "used" });
  });

  it("never touches another account's password", async () => {
    // A reset is scoped by the token's own row, so there is no path from one
    // user's link to another user's password — but it is worth an assertion,
    // because this is the one query in the app that rewrites a credential.
    const other = await makeUser();
    const token = await issueResetToken(userId);

    await consumeResetToken(token, await hashPassword("only-mine-changes"));

    const [row] = await getDb()
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, other.id));
    expect(await verifyPassword("the-original-password", row.passwordHash)).toBe(true);
    expect(await verifyPassword("only-mine-changes", row.passwordHash)).toBe(false);
  });

  it("sweeps rows that have aged out, and leaves live ones alone", async () => {
    const live = await issueResetToken(userId);
    const other = await makeUser();
    await issueResetToken(other.id);
    await getDb()
      .update(passwordResetTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(passwordResetTokens.userId, other.id));

    const swept = await sweepExpiredResetTokens();
    expect(swept).toBeGreaterThanOrEqual(1);
    expect((await findResetToken(live)).state).toBe("valid");
  });

  it("deleting an account takes its links with it", async () => {
    // The foreign key's cascade. Worth pinning: a token outliving its user
    // would be a row pointing at nothing, and `findResetToken` joins to
    // `users`.
    const doomed = await makeUser();
    const token = await issueResetToken(doomed.id);
    expect((await findResetToken(token)).state).toBe("valid");

    await getDb().delete(users).where(eq(users.id, doomed.id));
    expect(await findResetToken(token)).toEqual({ state: "unknown" });
  });
});
