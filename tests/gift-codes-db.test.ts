import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/db";
import { createGiftCodes, redeemGiftCode } from "@/db/gift-codes";
import { giftCodes, subscriptions, users } from "@/db/schema";
import { normalizeGiftCode } from "@/lib/billing/gift-codes";
import { hashPassword } from "@/lib/password";

/**
 * Gift codes, against a real database.
 *
 * The arithmetic and the code shape are unit tested in `gift-codes.test.ts`.
 * What is checked here is that redeeming actually enforces single use — the
 * property that lives in the claim's `where` clause, not in any pure
 * function — the same reasoning `password-reset.test.ts` gives for testing
 * `consumeResetToken` against a real database rather than a fixture.
 */

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("gift codes", () => {
  const createdUsers: string[] = [];

  async function makeUser(): Promise<string> {
    const [row] = await getDb()
      .insert(users)
      .values({
        email: `gift-${randomUUID()}@example.invalid`,
        passwordHash: await hashPassword("the-original-password"),
      })
      .returning({ id: users.id });
    createdUsers.push(row.id);
    return row.id;
  }

  afterAll(async () => {
    for (const id of createdUsers) {
      await getDb().delete(users).where(eq(users.id, id));
    }
  });

  it("mints the requested number of unredeemed codes", async () => {
    const codes = await createGiftCodes({ count: 3, plan: "monthly", durationDays: 30 });
    expect(codes).toHaveLength(3);

    for (const code of codes) {
      const [row] = await getDb()
        .select({ redeemedByUserId: giftCodes.redeemedByUserId })
        .from(giftCodes)
        .where(eq(giftCodes.code, normalizeGiftCode(code)));
      expect(row.redeemedByUserId).toBeNull();
    }
  });

  it("grants an active subscription on redemption", async () => {
    const userId = await makeUser();
    const [code] = await createGiftCodes({ count: 1, plan: "quarterly", durationDays: 90 });

    const result = await redeemGiftCode({ code, userId });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan).toBe("quarterly");

    const [row] = await getDb()
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    expect(row.status).toBe("active");
    expect(row.provider).toBe("gift");
    expect(row.currentPeriodEnd?.getTime()).toBeGreaterThan(Date.now() + 89 * 24 * 60 * 60 * 1000);
  });

  it("refuses an unknown code", async () => {
    const userId = await makeUser();
    const result = await redeemGiftCode({ code: "NOPE-NOPE-NOPE-NOPE", userId });
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("refuses the same code a second time", async () => {
    const firstUser = await makeUser();
    const secondUser = await makeUser();
    const [code] = await createGiftCodes({ count: 1, plan: "monthly", durationDays: 30 });

    const first = await redeemGiftCode({ code, userId: firstUser });
    expect(first.ok).toBe(true);

    const second = await redeemGiftCode({ code, userId: secondUser });
    expect(second).toEqual({ ok: false, reason: "already_redeemed" });

    // The second attempt granted nothing — the second user's row still
    // reads as never having had a subscription.
    const rows = await getDb()
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, secondUser));
    expect(rows).toHaveLength(0);
  });

  it("lets only one of two simultaneous redemptions through", async () => {
    const firstUser = await makeUser();
    const secondUser = await makeUser();
    const [code] = await createGiftCodes({ count: 1, plan: "monthly", durationDays: 30 });

    const [first, second] = await Promise.all([
      redeemGiftCode({ code, userId: firstUser }),
      redeemGiftCode({ code, userId: secondUser }),
    ]);

    const outcomes = [first.ok, second.ok].sort();
    expect(outcomes).toEqual([false, true]);
  });

  it("never pulls a later Stripe expiry backward", async () => {
    const userId = await makeUser();
    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await getDb().insert(subscriptions).values({
      userId,
      plan: "monthly",
      status: "active",
      provider: "stripe",
      providerSubscriptionRef: "sub_test_existing",
      currentPeriodEnd: farFuture,
    });

    const [code] = await createGiftCodes({ count: 1, plan: "monthly", durationDays: 30 });
    const result = await redeemGiftCode({ code, userId });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.periodEnd).toEqual(farFuture);
  });

  it("normalizes the code regardless of how it is typed", async () => {
    const userId = await makeUser();
    const [code] = await createGiftCodes({ count: 1, plan: "monthly", durationDays: 30 });
    const messy = `  ${code.toLowerCase().replace(/-/g, " ")}  `;

    const result = await redeemGiftCode({ code: messy, userId });
    expect(result.ok).toBe(true);
  });
});
