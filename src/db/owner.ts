import "server-only";

import { and, desc, eq, gt, isNotNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  aircraftInterest,
  attempts,
  giftCodes,
  subscriptions,
  testSessions,
  users,
} from "@/db/schema";

/**
 * What the owner can see about their own site.
 *
 * Every read here is unscoped — no `userId` filter, unlike every query in
 * `reports.ts`, which exists precisely so one student can never see
 * another's history. That inversion is the whole risk in this file, so it
 * is stated once here and guarded in exactly one place: every caller is a
 * page or action under `/owner`, and each of those checks `isOwner` before
 * calling anything in this module. Nothing else may import it.
 */

export type SiteOverview = {
  users: number;
  activeSubscribers: number;
  testsCompleted: number;
  answersRecorded: number;
  interestSignups: number;
  giftCodesUnredeemed: number;
};

/** The headline numbers, in one round trip each — the table is small enough. */
export async function getSiteOverview(): Promise<SiteOverview> {
  const db = getDb();
  const now = new Date();

  const [
    [userRow],
    [subscriberRow],
    [testRow],
    [answerRow],
    [interestRow],
    [codeRow],
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(users),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "active"),
          gt(subscriptions.currentPeriodEnd, now),
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(testSessions)
      .where(isNotNull(testSessions.completedAt)),
    db.select({ n: sql<number>`count(*)::int` }).from(attempts),
    db.select({ n: sql<number>`count(*)::int` }).from(aircraftInterest),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(giftCodes)
      .where(sql`${giftCodes.redeemedByUserId} is null`),
  ]);

  return {
    users: userRow?.n ?? 0,
    activeSubscribers: subscriberRow?.n ?? 0,
    testsCompleted: testRow?.n ?? 0,
    answersRecorded: answerRow?.n ?? 0,
    interestSignups: interestRow?.n ?? 0,
    giftCodesUnredeemed: codeRow?.n ?? 0,
  };
}

export type GiftCodeListing = {
  code: string;
  plan: "monthly" | "quarterly";
  durationDays: number;
  note: string | null;
  createdAt: Date;
  redeemedAt: Date | null;
  redeemedByEmail: string | null;
};

/**
 * Every code ever minted, newest first.
 *
 * Left-joined to `users` so an unredeemed code still appears — the list is
 * as much about what has *not* been used as what has.
 */
export async function listGiftCodes(limit = 200): Promise<GiftCodeListing[]> {
  const rows = await getDb()
    .select({
      code: giftCodes.code,
      plan: giftCodes.plan,
      durationDays: giftCodes.durationDays,
      note: giftCodes.note,
      createdAt: giftCodes.createdAt,
      redeemedAt: giftCodes.redeemedAt,
      redeemedByEmail: users.email,
    })
    .from(giftCodes)
    .leftJoin(users, eq(users.id, giftCodes.redeemedByUserId))
    .orderBy(desc(giftCodes.createdAt))
    .limit(limit);

  return rows;
}

export type SubscriberListing = {
  email: string;
  plan: "monthly" | "quarterly";
  status: "active" | "canceled" | "expired";
  provider: string;
  currentPeriodEnd: Date | null;
  updatedAt: Date;
};

/**
 * Everyone who has ever had a subscription row, newest change first —
 * including cancelled and expired ones, because "who used to pay" is a
 * question an owner asks as often as "who pays now".
 */
export async function listSubscribers(limit = 200): Promise<SubscriberListing[]> {
  const rows = await getDb()
    .select({
      email: users.email,
      plan: subscriptions.plan,
      status: subscriptions.status,
      provider: subscriptions.provider,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      updatedAt: subscriptions.updatedAt,
    })
    .from(subscriptions)
    .innerJoin(users, eq(users.id, subscriptions.userId))
    .orderBy(desc(subscriptions.updatedAt))
    .limit(limit);

  return rows;
}

export type InterestListing = {
  email: string;
  aircraft: string;
  createdAt: Date;
};

/**
 * The landing page's "which aircraft next?" captures.
 *
 * Until this existed the table was genuinely unreadable from anywhere but
 * `db:studio` — collected on every deployment since the landing page
 * shipped, and seen by nobody. That is what this is for.
 */
export async function listAircraftInterest(limit = 200): Promise<InterestListing[]> {
  const rows = await getDb()
    .select({
      email: aircraftInterest.email,
      aircraft: aircraftInterest.aircraft,
      createdAt: aircraftInterest.createdAt,
    })
    .from(aircraftInterest)
    .orderBy(desc(aircraftInterest.createdAt))
    .limit(limit);

  return rows;
}

export type InterestTally = { aircraft: string; requests: number };

/**
 * The same captures, counted by aircraft — the actual decision the list is
 * read to make. Grouped case-insensitively on trimmed text, because "A320",
 * "a320 " and "A320" are one request for the same type and counting them
 * as three would answer the question wrongly.
 */
export async function tallyAircraftInterest(limit = 20): Promise<InterestTally[]> {
  const rows = await getDb()
    .select({
      aircraft: sql<string>`min(${aircraftInterest.aircraft})`,
      requests: sql<number>`count(*)::int`,
    })
    .from(aircraftInterest)
    .groupBy(sql`lower(trim(${aircraftInterest.aircraft}))`)
    .orderBy(sql`count(*) desc`)
    .limit(limit);

  return rows;
}
