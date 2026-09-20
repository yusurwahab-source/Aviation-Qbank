import "server-only";

import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  accountNotes,
  aircraftInterest,
  attempts,
  giftCodeRedemptions,
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
    // "Unredeemed" now means "still has a slot free" rather than "nobody
    // has ever redeemed it" — a code minted with `maxRedemptions` > 1 keeps
    // counting here until every slot is spent, not just its first.
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(giftCodes)
      .where(sql`
        ${giftCodes.disabledAt} is null
        and (${giftCodes.expiresAt} is null or ${giftCodes.expiresAt} > now())
        and (
          select count(*) from ${giftCodeRedemptions}
          where ${giftCodeRedemptions.giftCodeId} = ${giftCodes.id}
        ) < ${giftCodes.maxRedemptions}
      `),
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

// Gift code listing (with redemption counts) now lives in `db/gift-codes.ts`
// beside `createGiftCodes` and `redeemGiftCode` — `listGiftCodesWithCounts`
// and `listGiftCodeRedemptions`.

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

/** The five ways the accounts list can be narrowed by access — "all" applies
 * no filter beyond the search term. */
export type AccountStatusFilter = "all" | "active" | "expiring_soon" | "lapsed" | "free_tier";

/** How many rows one page of the accounts list shows. */
export const ACCOUNTS_PAGE_SIZE = 25;

/** How soon counts as "expiring soon" on the accounts filter — the same
 * horizon the insights dashboard uses for its own expiring-subscriptions
 * count, so the two never disagree about what "soon" means. */
export const EXPIRING_SOON_DAYS = 14;

/**
 * The SQL condition for one status filter, matched against
 * `hasActiveSubscription`'s own two-column check (`status = 'active' and
 * current_period_end > now()`) rather than `status` alone — the same reason
 * the accounts and subscribers pages already render access that way. Kept
 * as SQL rather than filtering in JavaScript after the fact because a page
 * of *filtered* rows has to be a `limit`/`offset` the database applies, not
 * something sliced out of a page of unfiltered ones.
 */
function accountStatusCondition(filter: AccountStatusFilter) {
  switch (filter) {
    case "active":
      return sql`${subscriptions.status} = 'active' and ${subscriptions.currentPeriodEnd} > now()`;
    case "expiring_soon":
      return sql`${subscriptions.status} = 'active'
        and ${subscriptions.currentPeriodEnd} > now()
        and ${subscriptions.currentPeriodEnd} <= now() + interval '${sql.raw(String(EXPIRING_SOON_DAYS))} days'`;
    case "lapsed":
      return sql`${subscriptions.userId} is not null
        and not (${subscriptions.status} = 'active' and ${subscriptions.currentPeriodEnd} > now())`;
    case "free_tier":
      return isNull(subscriptions.userId);
    case "all":
      return undefined;
  }
}

/**
 * One page of accounts, with what each has done and what access it has.
 *
 * Left-joined to `subscriptions` so an account that never subscribed still
 * appears — most of them never will, and they are exactly the ones an owner
 * looks up in order to grant something. The two activity counts come from
 * correlated subqueries rather than a join with a `group by`: joining
 * `attempts` here would multiply the subscription row by every answer, and
 * counting distinct afterwards to undo that is slower and easier to get
 * wrong than asking the question directly.
 *
 * `total` comes from `count(*) over()` in the same query rather than a
 * second round trip — the filtered count and the page of rows can never
 * disagree about which filter they answered, because they are the same
 * query.
 */
export async function listAccounts(input: {
  search: string | null;
  statusFilter?: AccountStatusFilter;
  limit?: number;
  offset?: number;
}): Promise<{ rows: AccountListing[]; total: number }> {
  const term = input.search?.trim() ?? "";
  const limit = input.limit ?? ACCOUNTS_PAGE_SIZE;
  const offset = input.offset ?? 0;

  const conditions = [
    term === "" ? undefined : sql`${users.email} ilike ${`%${escapeLikePattern(term)}%`} escape '\\'`,
    accountStatusCondition(input.statusFilter ?? "all"),
  ].filter((condition) => condition !== undefined);

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
      total: sql<number>`count(*) over()::int`,
    })
    .from(users)
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      email: row.email,
      createdAt: row.createdAt,
      answersRecorded: row.answersRecorded,
      testsCompleted: row.testsCompleted,
      lastAnsweredAt: row.lastAnsweredAt,
      plan: row.plan,
      status: row.status,
      provider: row.provider,
      currentPeriodEnd: row.currentPeriodEnd,
    })),
    total: rows[0]?.total ?? 0,
  };
}

export type AccountRedemption = {
  code: string;
  plan: "monthly" | "quarterly";
  durationDays: number;
  redeemedAt: Date;
};

export type AccountDetail = {
  id: string;
  email: string;
  createdAt: Date;
  plan: "monthly" | "quarterly" | null;
  status: "active" | "canceled" | "expired" | null;
  provider: string | null;
  currentPeriodEnd: Date | null;
  answersRecorded: number;
  testsCompleted: number;
  /** Every test session ever started, finished or not — broader than
   * `testsCompleted`, which only counts ones that reached Finish. */
  sessionsStarted: number;
  lastAnsweredAt: Date | null;
  note: string;
  redemptions: AccountRedemption[];
};

/**
 * Everything the accounts detail screen shows about one account, or null if
 * the id does not exist — the same "stale id in a form" guard `grantAccess`
 * and `revokeAccess` already give.
 */
export async function getAccountDetail(userId: string): Promise<AccountDetail | null> {
  const db = getDb();

  const [[user], [subscription], [activity], note, redemptions] = await Promise.all([
    db
      .select({ id: users.id, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({
        plan: subscriptions.plan,
        status: subscriptions.status,
        provider: subscriptions.provider,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1),
    db
      .select({
        answersRecorded: sql<number>`count(distinct ${attempts.id})::int`,
        testsCompleted: sql<number>`count(distinct ${testSessions.id}) filter (
          where ${testSessions.completedAt} is not null
        )::int`,
        sessionsStarted: sql<number>`count(distinct ${testSessions.id})::int`,
        lastAnsweredAt: sql<Date | null>`max(${attempts.answeredAt})`,
      })
      .from(testSessions)
      .leftJoin(attempts, eq(attempts.testSessionId, testSessions.id))
      .where(eq(testSessions.userId, userId)),
    getAccountNote(userId),
    db
      .select({
        code: giftCodes.code,
        plan: giftCodes.plan,
        durationDays: giftCodes.durationDays,
        redeemedAt: giftCodeRedemptions.redeemedAt,
      })
      .from(giftCodeRedemptions)
      .innerJoin(giftCodes, eq(giftCodes.id, giftCodeRedemptions.giftCodeId))
      .where(eq(giftCodeRedemptions.userId, userId))
      .orderBy(desc(giftCodeRedemptions.redeemedAt)),
  ]);

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    plan: subscription?.plan ?? null,
    status: subscription?.status ?? null,
    provider: subscription?.provider ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    answersRecorded: activity?.answersRecorded ?? 0,
    testsCompleted: activity?.testsCompleted ?? 0,
    sessionsStarted: activity?.sessionsStarted ?? 0,
    lastAnsweredAt: activity?.lastAnsweredAt ?? null,
    note,
    redemptions,
  };
}

/** The owner's private note on one account. Empty string when none exists —
 * there is nothing to distinguish "no note" from "an empty note". */
export async function getAccountNote(userId: string): Promise<string> {
  const [row] = await getDb()
    .select({ body: accountNotes.body })
    .from(accountNotes)
    .where(eq(accountNotes.userId, userId))
    .limit(1);
  return row?.body ?? "";
}

/**
 * Replaces the owner's note on one account. One row per user, upserted in
 * place — a note has no history, only a current body, the same shape as
 * `question_notes`.
 */
export async function upsertAccountNote(userId: string, body: string): Promise<void> {
  await getDb()
    .insert(accountNotes)
    .values({ userId, body })
    .onConflictDoUpdate({
      target: accountNotes.userId,
      set: { body, updatedAt: sql`now()` },
    });
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
