import "server-only";

import { desc, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { logbookCredits, logbookExtractions, logbooks, users } from "@/db/schema";

/**
 * Logbook Scanner's unscoped reads, for `/owner/logbook` only — the same
 * inversion `owner.ts` makes, stated here for the same reason: these queries
 * take no `userId`, so every caller must sit behind `requireOwner()`.
 * Nothing in them reads logbook content; the owner sees usage and cost,
 * never a student's entries.
 */

export type LogbookUsageTotals = {
  extractions: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  costMicroUsd: number;
  unpricedExtractions: number;
};

async function totalsSince(since: Date | null): Promise<LogbookUsageTotals> {
  const [row] = await getDb()
    .select({
      extractions: sql<number>`count(*) filter (where ${logbookExtractions.status} = 'ok')::int`,
      failed: sql<number>`count(*) filter (where ${logbookExtractions.status} = 'failed')::int`,
      inputTokens: sql<number>`coalesce(sum(${logbookExtractions.inputTokens} + ${logbookExtractions.cacheReadTokens} + ${logbookExtractions.cacheWriteTokens}), 0)::bigint`,
      outputTokens: sql<number>`coalesce(sum(${logbookExtractions.outputTokens}), 0)::bigint`,
      costMicroUsd: sql<number>`coalesce(sum(${logbookExtractions.costMicroUsd}), 0)::bigint`,
      unpricedExtractions: sql<number>`count(*) filter (where ${logbookExtractions.costMicroUsd} is null and ${logbookExtractions.status} <> 'pending')::int`,
    })
    .from(logbookExtractions)
    .where(since ? gte(logbookExtractions.createdAt, since) : undefined);
  return {
    extractions: Number(row?.extractions ?? 0),
    failed: Number(row?.failed ?? 0),
    inputTokens: Number(row?.inputTokens ?? 0),
    outputTokens: Number(row?.outputTokens ?? 0),
    costMicroUsd: Number(row?.costMicroUsd ?? 0),
    unpricedExtractions: Number(row?.unpricedExtractions ?? 0),
  };
}

export async function getLogbookUsage() {
  const [allTime, last30Days, counts] = await Promise.all([
    totalsSince(null),
    totalsSince(new Date(Date.now() - 30 * 86_400_000)),
    getDb()
      .select({
        logbooks: sql<number>`(select count(*) from ${logbooks})::int`,
        unlocked: sql<number>`(select count(*) from ${logbooks} where ${logbooks.unlockedAt} is not null)::int`,
        unusedCredits: sql<number>`(select count(*) from ${logbookCredits} where ${logbookCredits.usedAt} is null)::int`,
      })
      .from(sql`(select 1) as one`),
  ]);
  return { allTime, last30Days, ...counts[0] };
}

export async function listRecentExtractions(limit = 100) {
  return getDb()
    .select({
      id: logbookExtractions.id,
      email: users.email,
      model: logbookExtractions.model,
      status: logbookExtractions.status,
      chargedTo: logbookExtractions.chargedTo,
      inputTokens: logbookExtractions.inputTokens,
      outputTokens: logbookExtractions.outputTokens,
      cacheReadTokens: logbookExtractions.cacheReadTokens,
      costMicroUsd: logbookExtractions.costMicroUsd,
      attempts: logbookExtractions.attempts,
      durationMs: logbookExtractions.durationMs,
      error: logbookExtractions.error,
      createdAt: logbookExtractions.createdAt,
    })
    .from(logbookExtractions)
    .innerJoin(users, eq(users.id, logbookExtractions.userId))
    .orderBy(desc(logbookExtractions.createdAt))
    .limit(limit);
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);
  return row?.id ?? null;
}
