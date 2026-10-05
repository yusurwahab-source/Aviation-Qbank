import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/db";
import { createGiftCodes, redeemGiftCode } from "@/db/gift-codes";
import {
  createLogbook,
  deleteAllLogbookData,
  finishExtraction,
  getLogbookAccess,
  getSpreadsRemaining,
  grantLogbookCredits,
  listLogbooks,
  reserveExtraction,
  saveLogbookData,
  unlockLogbook,
} from "@/db/logbooks";
import { subscriptions, users } from "@/db/schema";
import { FREE_SPREADS_PER_ACCOUNT, SPREADS_PER_UNLOCK } from "@/lib/logbook/entitlement";
import { hashPassword } from "@/lib/password";

/**
 * Logbook Scanner's allowance, against a real database: the reservation
 * lock, the free spreads, unlocking by credit and by subscription, and that
 * deleting logbook data does not hand the free spreads back.
 */

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("logbooks", () => {
  const createdUsers: string[] = [];
  const done = {
    status: "ok" as const,
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costMicroUsd: 7000,
    attempts: 1,
    durationMs: 1200,
  };

  async function makeUser(): Promise<string> {
    const [row] = await getDb()
      .insert(users)
      .values({ email: `logbook-${randomUUID()}@example.invalid`, passwordHash: await hashPassword("pw-123456789") })
      .returning({ id: users.id });
    createdUsers.push(row.id);
    return row.id;
  }

  async function scan(userId: string, logbookId: string) {
    const reservation = await reserveExtraction({ userId, logbookId, model: "claude-sonnet-5-5" });
    if (reservation.ok) await finishExtraction(reservation.extractionId, done);
    return reservation;
  }

  afterAll(async () => {
    for (const id of createdUsers) await getDb().delete(users).where(eq(users.id, id));
  });

  it("gives two free spreads per account and then refuses", async () => {
    const userId = await makeUser();
    const logbookId = await createLogbook(userId, "Test");

    for (let i = 0; i < FREE_SPREADS_PER_ACCOUNT; i += 1) {
      expect(await scan(userId, logbookId)).toMatchObject({ ok: true, chargedTo: "free" });
    }
    expect(await scan(userId, logbookId)).toEqual({ ok: false, reason: "free_exhausted" });

    // A second logbook does not reset the account's free spreads.
    const another = await createLogbook(userId, "Another");
    expect(await scan(userId, another)).toEqual({ ok: false, reason: "free_exhausted" });
  });

  it("does not count a failed extraction against the allowance", async () => {
    const userId = await makeUser();
    const logbookId = await createLogbook(userId, "Test");
    const reservation = await reserveExtraction({ userId, logbookId, model: "m" });
    if (!reservation.ok) throw new Error("expected a reservation");
    await finishExtraction(reservation.extractionId, { ...done, status: "failed" });
    expect((await getLogbookAccess(userId)).freeSpreadsUsed).toBe(0);
  });

  it("refuses another user's logbook", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const logbookId = await createLogbook(owner, "Mine");
    expect(await scan(other, logbookId)).toEqual({ ok: false, reason: "not_found" });
    expect(await unlockLogbook(other, logbookId)).toEqual({ ok: false, reason: "not_found" });
  });

  it("lets two racing uploads take only the last free spread once", async () => {
    const userId = await makeUser();
    const logbookId = await createLogbook(userId, "Race");
    await scan(userId, logbookId);
    const results = await Promise.all([
      reserveExtraction({ userId, logbookId, model: "m" }),
      reserveExtraction({ userId, logbookId, model: "m" }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("unlocks a logbook with a license code and allows forty more spreads", async () => {
    const userId = await makeUser();
    const logbookId = await createLogbook(userId, "Unlocked");
    for (let i = 0; i < FREE_SPREADS_PER_ACCOUNT; i += 1) await scan(userId, logbookId);

    expect(await unlockLogbook(userId, logbookId)).toEqual({ ok: false, reason: "no_credit" });

    const [code] = await createGiftCodes({ count: 1, plan: "monthly", durationDays: 0, grants: "logbook" });
    const redeemed = await redeemGiftCode({ code, userId });
    expect(redeemed).toEqual({ ok: true, grants: "logbook" });
    // A logbook code grants no subscription.
    const subs = await getDb().select().from(subscriptions).where(eq(subscriptions.userId, userId));
    expect(subs).toHaveLength(0);

    expect((await getLogbookAccess(userId)).availableUnlocks).toBe(1);
    expect(await unlockLogbook(userId, logbookId)).toMatchObject({ ok: true, source: "gift" });
    // Unlocking again spends nothing.
    expect(await unlockLogbook(userId, logbookId)).toMatchObject({ ok: true, alreadyUnlocked: true });
    expect((await getLogbookAccess(userId)).availableUnlocks).toBe(0);

    expect(await getSpreadsRemaining(userId, logbookId)).toBe(SPREADS_PER_UNLOCK);
    for (let i = 0; i < SPREADS_PER_UNLOCK; i += 1) {
      expect(await scan(userId, logbookId)).toMatchObject({ ok: true, chargedTo: "unlock" });
    }
    expect(await scan(userId, logbookId)).toEqual({ ok: false, reason: "logbook_full" });
  });

  it("includes one conversion with an active subscription, once", async () => {
    const userId = await makeUser();
    await getDb().insert(subscriptions).values({
      userId,
      plan: "monthly",
      status: "active",
      provider: "manual",
      currentPeriodEnd: new Date(Date.now() + 86_400_000),
    });
    const first = await createLogbook(userId, "First");
    const second = await createLogbook(userId, "Second");

    expect(await unlockLogbook(userId, first)).toMatchObject({ ok: true, source: "subscription" });
    expect(await unlockLogbook(userId, second)).toEqual({ ok: false, reason: "no_credit" });

    await grantLogbookCredits({ userId, source: "manual", count: 1 });
    expect(await unlockLogbook(userId, second)).toMatchObject({ ok: true, source: "manual" });
  });

  it("saves only on request and deletes everything on request, keeping the meter", async () => {
    const userId = await makeUser();
    const logbookId = await createLogbook(userId, "Saved");
    expect(await listLogbooks(userId)).toEqual([]);

    await scan(userId, logbookId);
    await saveLogbookData(userId, logbookId, "Saved", { version: 1, pages: [] });
    expect((await listLogbooks(userId)).map((l) => l.id)).toEqual([logbookId]);

    expect(await deleteAllLogbookData(userId)).toBe(1);
    expect(await listLogbooks(userId)).toEqual([]);
    expect((await getLogbookAccess(userId)).freeSpreadsUsed).toBe(1);
  });
});
