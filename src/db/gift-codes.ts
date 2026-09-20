import "server-only";

import { randomBytes } from "node:crypto";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { giftCodeRedemptions, giftCodes, subscriptions, users } from "@/db/schema";
import type { GiftCodeRow } from "@/db/schema";
import {
  computeGiftPeriodEnd,
  generateGiftCode,
  normalizeGiftCode,
} from "@/lib/billing/gift-codes";

/**
 * Minting and redeeming license keys.
 *
 * Started as free-access gift codes, single-use only — `createGiftCodes` is
 * still called by `scripts/generate-gift-codes.ts`, run by hand — and is now
 * general-purpose: a code may be redeemed by more than one person
 * (`maxRedemptions`), go stale on its own (`expiresAt`), or be turned off by
 * the owner without losing its history (`disabledAt`). Redeeming is still
 * the one path a student drives themselves, and the one path that can grant
 * access here without Stripe, so it keeps the same care the Stripe webhook
 * gets: a code is claimed atomically, and the subscription row is updated in
 * the same transaction as the claim.
 */

export type CreateGiftCodesInput = {
  count: number;
  plan: "monthly" | "quarterly";
  durationDays: number;
  note?: string | null;
  /** Defaults to 1 — the original single-use behaviour. */
  maxRedemptions?: number;
  expiresAt?: Date | null;
  /** Recorded, not enforced — see the note on the column in `schema.ts`. */
  unlocksAircraftCode?: string | null;
};

/** Mints `count` fresh codes and returns them in their display form (with dashes). */
export async function createGiftCodes(input: CreateGiftCodesInput): Promise<string[]> {
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
        maxRedemptions: input.maxRedemptions ?? 1,
        expiresAt: input.expiresAt ?? null,
        unlocksAircraftCode: input.unlocksAircraftCode ?? null,
      })
      .onConflictDoNothing({ target: giftCodes.code })
      .returning({ code: giftCodes.code });

    if (inserted) codes.push(code);
  }

  return codes;
}

/** Stops a code being redeemed further, without deleting it or its
 * redemption history. Returns null if the code does not exist. */
export async function disableGiftCode(giftCodeId: string): Promise<{ code: string } | null> {
  const [row] = await getDb()
    .update(giftCodes)
    .set({ disabledAt: sql`now()` })
    .where(eq(giftCodes.id, giftCodeId))
    .returning({ code: giftCodes.code });
  return row ?? null;
}

export type RedeemGiftCodeResult =
  | { ok: true; plan: "monthly" | "quarterly"; periodEnd: Date }
  | {
      ok: false;
      reason: "not_found" | "disabled" | "expired" | "exhausted" | "already_redeemed";
    };

/**
 * Spends a code and grants access, in one transaction.
 *
 * `select ... for update` locks the code's own row for the rest of the
 * transaction, which is what makes the count-against-`maxRedemptions` check
 * below safe against two redemptions racing for the last remaining slot —
 * the same problem the original `where redeemed_by_user_id is null` solved
 * with a single-column gate, now needed explicitly because the gate is a
 * count across a child table rather than one column on the code itself.
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
    const [code] = await tx
      .select()
      .from(giftCodes)
      .where(eq(giftCodes.code, normalized))
      .for("update")
      .limit(1);

    if (!code) return { ok: false, reason: "not_found" };
    if (code.disabledAt) return { ok: false, reason: "disabled" };
    if (code.expiresAt && code.expiresAt.getTime() <= Date.now()) {
      return { ok: false, reason: "expired" };
    }

    const [alreadyRedeemed] = await tx
      .select({ id: giftCodeRedemptions.id })
      .from(giftCodeRedemptions)
      .where(
        and(eq(giftCodeRedemptions.giftCodeId, code.id), eq(giftCodeRedemptions.userId, input.userId)),
      )
      .limit(1);
    if (alreadyRedeemed) return { ok: false, reason: "already_redeemed" };

    const [{ count: redemptionCount }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(giftCodeRedemptions)
      .where(eq(giftCodeRedemptions.giftCodeId, code.id));

    if (redemptionCount >= code.maxRedemptions) return { ok: false, reason: "exhausted" };

    await tx.insert(giftCodeRedemptions).values({ giftCodeId: code.id, userId: input.userId });

    // "Who redeemed this first" for the original single-use display path —
    // see the note on these two columns in `schema.ts`. Left untouched on
    // every redemption after the first.
    await tx
      .update(giftCodes)
      .set({
        redeemedByUserId: sql`coalesce(${giftCodes.redeemedByUserId}, ${input.userId}::uuid)`,
        redeemedAt: sql`coalesce(${giftCodes.redeemedAt}, now())`,
      })
      .where(eq(giftCodes.id, code.id));

    const [existingSubscription] = await tx
      .select({ currentPeriodEnd: subscriptions.currentPeriodEnd })
      .from(subscriptions)
      .where(eq(subscriptions.userId, input.userId))
      .limit(1);

    const periodEnd = computeGiftPeriodEnd(
      new Date(),
      code.durationDays,
      existingSubscription?.currentPeriodEnd ?? null,
    );

    await tx
      .insert(subscriptions)
      .values({
        userId: input.userId,
        plan: code.plan,
        status: "active",
        provider: "gift",
        providerSubscriptionRef: null,
        currentPeriodEnd: periodEnd,
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          plan: code.plan,
          status: "active",
          provider: "gift",
          providerSubscriptionRef: null,
          currentPeriodEnd: periodEnd,
          updatedAt: sql`now()`,
        },
      });

    return { ok: true, plan: code.plan, periodEnd };
  });
}

export type GiftCodeListing = GiftCodeRow & {
  redemptionCount: number;
  redeemedByEmail: string | null;
};

/** Every code ever minted, newest first, with how many times it has been
 * redeemed — the count the owner screen gates a "Disable" button on and
 * shows against `maxRedemptions`. */
export async function listGiftCodesWithCounts(limit = 200): Promise<GiftCodeListing[]> {
  const db = getDb();

  const rows = await db
    .select({
      code: giftCodes,
      redemptionCount: sql<number>`(
        select count(*)::int from ${giftCodeRedemptions}
        where ${giftCodeRedemptions.giftCodeId} = ${giftCodes.id}
      )`,
    })
    .from(giftCodes)
    .orderBy(desc(giftCodes.createdAt))
    .limit(limit);

  if (rows.length === 0) return [];

  // The first redeemer's email, for the existing single-use display —
  // fetched separately rather than joined, since a join to `users` here
  // would need the same "first redeemer" filtering the query above already
  // avoids by not joining `gift_code_redemptions` directly.
  const firstRedeemerIds = rows
    .map((row) => row.code.redeemedByUserId)
    .filter((id): id is string => id !== null);

  const emailById = new Map<string, string>();
  if (firstRedeemerIds.length > 0) {
    const emailRows = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(inArray(users.id, firstRedeemerIds));
    for (const row of emailRows) emailById.set(row.id, row.email);
  }

  return rows.map((row) => ({
    ...row.code,
    redemptionCount: row.redemptionCount,
    redeemedByEmail: row.code.redeemedByUserId ? (emailById.get(row.code.redeemedByUserId) ?? null) : null,
  }));
}

export type GiftCodeRedemptionListing = { email: string; redeemedAt: Date };

/** Every redemption of one code, newest first — who and when. */
export async function listGiftCodeRedemptions(
  giftCodeId: string,
): Promise<GiftCodeRedemptionListing[]> {
  return getDb()
    .select({ email: users.email, redeemedAt: giftCodeRedemptions.redeemedAt })
    .from(giftCodeRedemptions)
    .innerJoin(users, eq(users.id, giftCodeRedemptions.userId))
    .where(eq(giftCodeRedemptions.giftCodeId, giftCodeId))
    .orderBy(desc(giftCodeRedemptions.redeemedAt));
}
