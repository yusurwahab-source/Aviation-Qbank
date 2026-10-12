import "server-only";

import { and, count, desc, eq, gt, isNotNull, isNull, or, sql } from "drizzle-orm";

import { FREE_MODE } from "@/config/free-mode";
import { getDb } from "@/db";
import { logbookCredits, logbookExtractions, logbooks, subscriptions } from "@/db/schema";
import { hasActiveSubscription } from "@/lib/billing/access-policy";
import {
  availableUnlocks,
  decideExtraction,
  pickUnlockSource,
  spreadsRemaining,
  type ExtractionDecision,
} from "@/lib/logbook/entitlement";

/**
 * Logbook Scanner's database side. Every query here takes a `userId` and
 * filters on it, the same rule `reports.ts` keeps: a logbook is somebody's
 * own record. The owner's unscoped reads live in `owner.ts`-style isolation
 * at the bottom of this file and are only imported under `/owner`.
 */

/** A `pending` reservation older than this no longer holds a spread. */
const PENDING_TTL_MS = 10 * 60 * 1000;

function countsAsUsed(since: Date) {
  return or(
    eq(logbookExtractions.status, "ok"),
    and(eq(logbookExtractions.status, "pending"), gt(logbookExtractions.createdAt, since)),
  );
}

export type LogbookSummaryRow = {
  id: string;
  name: string;
  unlockedAt: Date | null;
  savedAt: Date | null;
  updatedAt: Date;
};

export async function createLogbook(userId: string, name: string): Promise<string> {
  const [row] = await getDb().insert(logbooks).values({ userId, name }).returning({ id: logbooks.id });
  return row.id;
}

export async function getLogbook(userId: string, logbookId: string) {
  const [row] = await getDb()
    .select()
    .from(logbooks)
    .where(and(eq(logbooks.id, logbookId), eq(logbooks.userId, userId)))
    .limit(1);
  return row ?? null;
}

/** The logbooks worth listing: saved ones, and unlocked ones — an unlock
 * was paid for and must stay findable even if nothing was saved. */
export async function listLogbooks(userId: string): Promise<LogbookSummaryRow[]> {
  return getDb()
    .select({
      id: logbooks.id,
      name: logbooks.name,
      unlockedAt: logbooks.unlockedAt,
      savedAt: logbooks.savedAt,
      updatedAt: logbooks.updatedAt,
    })
    .from(logbooks)
    .where(and(eq(logbooks.userId, userId), or(isNotNull(logbooks.savedAt), isNotNull(logbooks.unlockedAt))))
    .orderBy(desc(logbooks.updatedAt));
}

export async function saveLogbookData(
  userId: string,
  logbookId: string,
  name: string,
  data: unknown,
): Promise<boolean> {
  const updated = await getDb()
    .update(logbooks)
    .set({ name, data, savedAt: sql`now()`, updatedAt: sql`now()` })
    .where(and(eq(logbooks.id, logbookId), eq(logbooks.userId, userId)))
    .returning({ id: logbooks.id });
  return updated.length > 0;
}

/**
 * "Delete all my logbook data": every logbook row, with whatever was saved
 * in it. The usage meter (`logbook_extractions`) holds no content and stays,
 * so deleting is not a way to get the free spreads back; unspent credits
 * stay too, since they are the student's, not logbook data.
 */
export async function deleteAllLogbookData(userId: string): Promise<number> {
  const deleted = await getDb()
    .delete(logbooks)
    .where(eq(logbooks.userId, userId))
    .returning({ id: logbooks.id });
  return deleted.length;
}

export type LogbookAccess = {
  freeSpreadsUsed: number;
  unusedCredits: number;
  subscriptionCreditUsed: boolean;
  hasActiveSubscription: boolean;
  availableUnlocks: number;
};

async function readAccess(
  db: Pick<ReturnType<typeof getDb>, "select">,
  userId: string,
): Promise<LogbookAccess> {
  const since = new Date(Date.now() - PENDING_TTL_MS);
  const [free] = await db
    .select({ n: count() })
    .from(logbookExtractions)
    .where(
      and(
        eq(logbookExtractions.userId, userId),
        eq(logbookExtractions.chargedTo, "free"),
        countsAsUsed(since),
      ),
    );
  const [credits] = await db
    .select({
      unused: sql<number>`count(*) filter (where ${logbookCredits.usedAt} is null)::int`,
      subscriptionUsed: sql<number>`count(*) filter (where ${logbookCredits.source} = 'subscription')::int`,
    })
    .from(logbookCredits)
    .where(eq(logbookCredits.userId, userId));
  const [subscription] = await db
    .select({ status: subscriptions.status, currentPeriodEnd: subscriptions.currentPeriodEnd })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const state = {
    unusedCredits: credits?.unused ?? 0,
    subscriptionCreditUsed: (credits?.subscriptionUsed ?? 0) > 0,
    hasActiveSubscription: hasActiveSubscription(subscription ?? null),
  };
  return { freeSpreadsUsed: Number(free?.n ?? 0), ...state, availableUnlocks: availableUnlocks(state) };
}

export async function getLogbookAccess(userId: string): Promise<LogbookAccess> {
  return readAccess(getDb(), userId);
}

async function unlockSpreadsUsed(
  db: Pick<ReturnType<typeof getDb>, "select">,
  logbookId: string,
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(logbookExtractions)
    .where(
      and(
        eq(logbookExtractions.logbookId, logbookId),
        eq(logbookExtractions.chargedTo, "unlock"),
        countsAsUsed(new Date(Date.now() - PENDING_TTL_MS)),
      ),
    );
  return Number(row?.n ?? 0);
}

/** How many more spreads this logbook can take right now. */
export async function getSpreadsRemaining(userId: string, logbookId: string): Promise<number> {
  const db = getDb();
  const logbook = await getLogbook(userId, logbookId);
  if (!logbook) return 0;
  const access = await readAccess(db, userId);
  return spreadsRemaining({
    freeSpreadsUsed: access.freeSpreadsUsed,
    logbookUnlocked: logbook.unlockedAt !== null,
    logbookUnlockSpreadsUsed: await unlockSpreadsUsed(db, logbookId),
    freeMode: FREE_MODE,
  });
}

export type Reservation =
  | { ok: true; extractionId: string; chargedTo: "free" | "unlock" }
  | { ok: false; reason: "not_found" | Extract<ExtractionDecision, { allowed: false }>["reason"] };

/**
 * Takes one spread from this student's allowance *before* the model is
 * called, as a `pending` row, under a per-user advisory lock — so two
 * uploads racing for the last spread cannot both get it. The caller turns
 * the row into `ok` or `failed`; only `ok` and a fresh `pending` count.
 */
export async function reserveExtraction(input: {
  userId: string;
  logbookId: string;
  model: string;
}): Promise<Reservation> {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`logbook:${input.userId}`}))`);

    const [logbook] = await tx
      .select({ unlockedAt: logbooks.unlockedAt })
      .from(logbooks)
      .where(and(eq(logbooks.id, input.logbookId), eq(logbooks.userId, input.userId)))
      .limit(1);
    if (!logbook) return { ok: false, reason: "not_found" };

    const access = await readAccess(tx, input.userId);
    const decision = decideExtraction({
      freeSpreadsUsed: access.freeSpreadsUsed,
      logbookUnlocked: logbook.unlockedAt !== null,
      logbookUnlockSpreadsUsed: await unlockSpreadsUsed(tx, input.logbookId),
      freeMode: FREE_MODE,
    });
    if (!decision.allowed) return { ok: false, reason: decision.reason };

    const [row] = await tx
      .insert(logbookExtractions)
      .values({
        userId: input.userId,
        logbookId: input.logbookId,
        chargedTo: decision.chargeTo,
        status: "pending",
        model: input.model,
      })
      .returning({ id: logbookExtractions.id });
    return { ok: true, extractionId: row.id, chargedTo: decision.chargeTo };
  });
}

export async function finishExtraction(
  extractionId: string,
  result: {
    status: "ok" | "failed";
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    costMicroUsd: number | null;
    attempts: number;
    durationMs: number;
    error?: string | null;
  },
): Promise<void> {
  await getDb()
    .update(logbookExtractions)
    .set({ ...result, error: result.error ? result.error.slice(0, 200) : null })
    .where(eq(logbookExtractions.id, extractionId));
}

export type UnlockResult =
  | { ok: true; source: string; alreadyUnlocked: boolean }
  | { ok: false; reason: "not_found" | "no_credit" };

/** Spends one credit on this logbook, in one transaction under the same
 * per-user lock as reservations. Unlocking twice spends nothing twice. */
export async function unlockLogbook(userId: string, logbookId: string): Promise<UnlockResult> {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`logbook:${userId}`}))`);

    const [logbook] = await tx
      .select({ unlockedAt: logbooks.unlockedAt, unlockSource: logbooks.unlockSource })
      .from(logbooks)
      .where(and(eq(logbooks.id, logbookId), eq(logbooks.userId, userId)))
      .limit(1);
    if (!logbook) return { ok: false, reason: "not_found" };
    if (logbook.unlockedAt) return { ok: true, source: logbook.unlockSource ?? "", alreadyUnlocked: true };

    const access = await readAccess(tx, userId);
    const pick = pickUnlockSource(access);
    if (!pick) return { ok: false, reason: "no_credit" };

    let source: string;
    if (pick === "credit") {
      const [credit] = await tx
        .select({ id: logbookCredits.id, source: logbookCredits.source })
        .from(logbookCredits)
        .where(and(eq(logbookCredits.userId, userId), isNull(logbookCredits.usedAt)))
        .orderBy(logbookCredits.createdAt)
        .limit(1);
      if (!credit) return { ok: false, reason: "no_credit" };
      await tx
        .update(logbookCredits)
        .set({ usedAt: sql`now()`, usedForLogbookId: logbookId })
        .where(eq(logbookCredits.id, credit.id));
      source = credit.source;
    } else {
      await tx.insert(logbookCredits).values({
        userId,
        source: "subscription",
        usedAt: sql`now()`,
        usedForLogbookId: logbookId,
      });
      source = "subscription";
    }

    await tx
      .update(logbooks)
      .set({ unlockedAt: sql`now()`, unlockSource: source, updatedAt: sql`now()` })
      .where(eq(logbooks.id, logbookId));
    return { ok: true, source, alreadyUnlocked: false };
  });
}

/**
 * The one hook a payment provider calls once a purchase is confirmed — the
 * same role the Stripe webhook plays for subscriptions. Nothing calls it
 * yet; see `LOGBOOK_PURCHASES_ENABLED`.
 */
export async function grantLogbookCredits(input: {
  userId: string;
  source: "gift" | "manual" | "purchase";
  count?: number;
  giftCodeId?: string | null;
  note?: string | null;
}): Promise<void> {
  const n = input.count ?? 1;
  await getDb()
    .insert(logbookCredits)
    .values(
      Array.from({ length: n }, () => ({
        userId: input.userId,
        source: input.source,
        giftCodeId: input.giftCodeId ?? null,
        note: input.note ?? null,
      })),
    );
}
