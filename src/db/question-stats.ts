import "server-only";

import { inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { questionStats } from "@/db/schema";
import { communityPercentCorrect } from "@/lib/community-stats";

/**
 * Reading the cached community stat — see `question_stats` in `schema.ts`
 * and `scripts/compute-question-stats.ts`, which is the only thing that
 * ever writes here. This file only reads a table someone else has already
 * populated; there is no per-request aggregation to be found in it.
 *
 * One query for however many questions are on screen at once — a whole
 * test's worth, not one call per question — keyed by id so the caller can
 * look each one up as it renders.
 */
export async function getCommunityPercentCorrect(
  questionIds: string[],
): Promise<Record<string, number>> {
  if (questionIds.length === 0) return {};

  const rows = await getDb()
    .select()
    .from(questionStats)
    .where(inArray(questionStats.questionId, questionIds));

  const result: Record<string, number> = {};
  for (const row of rows) {
    const pct = communityPercentCorrect(row);
    if (pct !== null) result[row.questionId] = pct;
  }
  return result;
}
