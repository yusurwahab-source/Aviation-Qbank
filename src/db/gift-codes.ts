import "server-only";

import { randomBytes } from "node:crypto";

import { and, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { giftCodes, subscriptions } from "@/db/schema";
import {
  computeGiftPeriodEnd,
  generateGiftCode,
  normalizeGiftCode,
} from "@/lib/billing/gift-codes";

/**
 * Minting and redeeming free-access codes.
 *
 * There is no admin panel to drive this from — `createGiftCodes` is called
 * by `scripts/generate-gift-codes.ts`, run by hand, the same way content
 * only ever reaches the database through `db:seed`. Redeeming is the one
 * path a student uses themselves, and it is the one path that can grant
 * access here without Stripe, so it earns the same care as the Stripe
 * webhook: a code is claimed atomically, and the subscription row is
 * updated in the same transaction as the claim.
 */

/** Mints `count` fresh codes and returns them in their display form (with dashes). */
export async function createGiftCodes(input: {
  count: number;
  plan: "monthly" | "quarterly";
  durationDays: number;
  note?: string | null;
}): Promise<string[]> {
  const db = getDb();
  const codes: string[] = [];

  while (codes.length < input.count) {
    const code = generateGiftCode(randomBytes(16));
    const normalized = normalizeGiftCode(code);

    // A collision at this code length is astronomically unlikely — this
    // guards against it happening anyway, by retrying rather than by
    // trusting the odds.
    const [inserted] = await db
      .insert(giftCodes)
      .values({
        code: normalized,
        plan: input.plan,
        durationDays: input.durationDays,
        note: input.note ?? null,
      })
      .onConflictDoNothing({ target: giftCodes.code })
      .returning({ code: giftCodes.code });

    if (inserted) codes.push(code);
  }

  return codes;
}

export type RedeemGiftCodeResult =
  | { ok: true; plan: "monthly" | "quarterly"; periodEnd: Date }
  | { ok: false; reason: "not_found" | "already_redeemed" };

/**
 * Spends a code and grants access, in one transaction.
 *
 * The `redeemedByUserId is null` in the claim's own `where` is what makes
 * this safe against two redemption attempts racing on the same code —
 * exactly the reasoning `consumeResetToken` documents for its own `where
 * usedAt is null`. Losing the race returns `"already_redeemed"` rather than
 * silently granting nothing.
 *
 * The subscription row is extended, never shrunk — see
 * `computeGiftPeriodEnd` — so redeeming a code while a real, later-expiring
 * Stripe subscription is active cannot leave the account worse off.
 */
export async function redeemGiftCode(input: {
  code: string;
  userId: string;
}): Promise<RedeemGiftCodeResult> {
  const normalized = normalizeGiftCode(input.code);
  const db = getDb();

  return db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(giftCodes)
      .set({ redeemedByUserId: input.userId, redeemedAt: new Date() })
      .where(and(eq(giftCodes.code, normalized), isNull(giftCodes.redeemedByUserId)))
      .returning({ plan: giftCodes.plan, durationDays: giftCodes.durationDays });

    if (!claimed) {
      // Either there is no such code, or somebody already spent it. Read it
      // back so the screen can say which — neither answer reveals anything
      // about a person, only about a code.
      const [existing] = await tx
        .select({ id: giftCodes.id })
        .from(giftCodes)
        .where(eq(giftCodes.code, normalized))
        .limit(1);
      return { ok: false, reason: existing ? "already_redeemed" : "not_found" };
    }

    const [existingSubscription] = await tx
      .select({ currentPeriodEnd: subscriptions.currentPeriodEnd })
      .from(subscriptions)
      .where(eq(subscriptions.userId, input.userId))
      .limit(1);

    const periodEnd = computeGiftPeriodEnd(
      new Date(),
      claimed.durationDays,
      existingSubscription?.currentPeriodEnd ?? null,
    );

    await tx
      .insert(subscriptions)
      .values({
        userId: input.userId,
        plan: claimed.plan,
        status: "active",
        provider: "gift",
        providerSubscriptionRef: null,
        currentPeriodEnd: periodEnd,
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          plan: claimed.plan,
          status: "active",
          provider: "gift",
          providerSubscriptionRef: null,
          currentPeriodEnd: periodEnd,
          updatedAt: sql`now()`,
        },
      });

    return { ok: true, plan: claimed.plan, periodEnd };
  });
}
