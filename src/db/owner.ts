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
import { computeGiftPeriodEnd } from "@/lib/billing/gift-codes";

/**
 * What the owner can see about their own site, and the two things they can
 * change about somebody else's access to it.
 *
 * Every read here is unscoped — no `userId` filter, unlike every query in
 * `reports.ts`, which exists precisely so one student can never see
 * another's history. That inversion is the whole risk in this file, so it
 * is stated once here and guarded in exactly one place: every caller is a
 * page or action under `/owner`, and each of those checks `isOwner` before
 * calling anything in this module. Nothing else may import it.
 *
 * `grantAccess` and `revokeAccess` are the only writes, and they are the
 * reason that guard matters more here than anywhere else in the codebase:
 * an unscoped read shows one person data that is not theirs, while an
 * unscoped write hands them somebody else's subscription.
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

export type AccountListing = {
  id: string;
  email: string;
  createdAt: Date;
  answersRecorded: number;
  testsCompleted: number;
  lastAnsweredAt: Date | null;
  plan: "monthly" | "quarterly" | null;
  status: "active" | "canceled" | "expired" | null;
  provider: string | null;
  currentPeriodEnd: Date | null;
};

/**
 * `%` and `_` are wildcards to `ilike`, and a backslash escapes them. A
 * search for `a_b` must look for that literal string rather than "a,
 * anything, b" — an owner typing an email into a box is not writing a
 * pattern, and treating their input as one would quietly return the wrong
 * account.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Every account, with what it has done and what access it has.
 *
 * Left-joined to `subscriptions` so an account that never subscribed still
 * appears — most of them never will, and they are exactly the ones an owner
 * looks up in order to grant something. The two activity counts come from
 * correlated subqueries rather than a join with a `group by`: joining
 * `attempts` here would multiply the subscription row by every answer, and
 * counting distinct afterwards to undo that is slower and easier to get
 * wrong than asking the question directly.
 */
export async function listAccounts(
  search: string | null,
  limit = 100,
): Promise<AccountListing[]> {
  const term = search?.trim() ?? "";

  const rows = await getDb()
    .select({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
      answersRecorded: sql<number>`(
        select count(*)::int from ${attempts} where ${attempts.userId} = ${users.id}
      )`,
      testsCompleted: sql<number>`(
        select count(*)::int from ${testSessions}
        where ${testSessions.userId} = ${users.id} and ${testSessions.completedAt} is not null
      )`,
      lastAnsweredAt: sql<Date | null>`(
        select max(${attempts.answeredAt}) from ${attempts} where ${attempts.userId} = ${users.id}
      )`,
      plan: subscriptions.plan,
      status: subscriptions.status,
      provider: subscriptions.provider,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(users)
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .where(
      term === ""
        ? undefined
        : sql`${users.email} ilike ${`%${escapeLikePattern(term)}%`} escape '\\'`,
    )
    .orderBy(desc(users.createdAt))
    .limit(limit);

  return rows;
}

/**
 * Gives one account full access for a number of days, without Stripe and
 * without a code.
 *
 * `provider: "manual"` rather than `"gift"`: both are free access, but only
 * one of them can be traced back to a row in `gift_codes`, and an owner
 * reading the subscribers list later should be able to tell "I typed this
 * in" from "somebody redeemed a code I minted". The column has always been
 * a name rather than a boolean for exactly this reason.
 *
 * Extension, never replacement — `computeGiftPeriodEnd` is reused rather
 * than reimplemented because the arithmetic is the same question: granting
 * thirty days to somebody who already has ninety must not cost them sixty.
 * It cannot reach into Stripe, so an account paying through Stripe keeps
 * billing exactly as before; this only moves the date access runs out.
 *
 * Returns null when there is no such account, so a stale id in a form
 * cannot silently create a subscription belonging to nobody.
 */
export async function grantAccess(input: {
  userId: string;
  plan: "monthly" | "quarterly";
  days: number;
}): Promise<{ email: string; periodEnd: Date } | null> {
  return getDb().transaction(async (tx) => {
    const [user] = await tx
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);

    if (!user) return null;

    const [existing] = await tx
      .select({ currentPeriodEnd: subscriptions.currentPeriodEnd })
      .from(subscriptions)
      .where(eq(subscriptions.userId, input.userId))
      .limit(1);

    const periodEnd = computeGiftPeriodEnd(
      new Date(),
      input.days,
      existing?.currentPeriodEnd ?? null,
    );

    await tx
      .insert(subscriptions)
      .values({
        userId: input.userId,
        plan: input.plan,
        status: "active",
        provider: "manual",
        providerSubscriptionRef: null,
        currentPeriodEnd: periodEnd,
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          plan: input.plan,
          status: "active",
          provider: "manual",
          providerSubscriptionRef: null,
          currentPeriodEnd: periodEnd,
          updatedAt: sql`now()`,
        },
      });

    return { email: user.email, periodEnd };
  });
}

/**
 * Takes access away from one account, now.
 *
 * `status: "canceled"` is enough on its own — `hasActiveSubscription`
 * refuses anything that is not `active`, so the period end is deliberately
 * left where it was rather than rewritten to the past. Keeping it means the
 * row still records what the account had, which is what makes granting it
 * back honest.
 *
 * What this does **not** do is cancel anything at Stripe. A Stripe-backed
 * subscription carries on billing, and its next renewal event will write
 * this row back to `active` — that is the webhook doing its job, not a bug.
 * The provider is returned so the screen can say so plainly rather than
 * letting the owner believe money has stopped moving.
 */
export async function revokeAccess(
  userId: string,
): Promise<{ email: string; provider: string } | null> {
  return getDb().transaction(async (tx) => {
    const [user] = await tx
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return null;

    const [revoked] = await tx
      .update(subscriptions)
      .set({ status: "canceled", updatedAt: sql`now()` })
      .where(eq(subscriptions.userId, userId))
      .returning({ provider: subscriptions.provider });

    return revoked ? { email: user.email, provider: revoked.provider } : null;
  });
}
