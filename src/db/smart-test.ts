import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { attempts, questionFlags, questions } from "@/db/schema";
import type { QuestionSignal } from "@/lib/smart-test";

/**
 * The one query behind the smart test: for every published question a
 * student could be shown, what their history with it says right now.
 *
 * A single query regardless of bank or history size — never one round trip
 * per candidate question. The `ranked` CTE numbers this user's attempts on
 * each question newest-first and marks, with a running sum, the point
 * (`break_group`) where an unbroken run of correct answers stops — the same
 * row_number/window technique `getQuestionsToRetry` in `db/reports.ts`
 * already uses for "most recent answer". `per_question` collapses that down
 * to one row per question actually attempted; the outer query then left
 * joins every *published* question in scope onto it, which is what supplies
 * the never-attempted ones — `per_question` alone would simply omit them,
 * and "never seen" is one of the five weights the algorithm needs to tell
 * apart.
 *
 * Scoped to one aircraft, optionally narrowed to a set of sections, exactly
 * like every other test-building query in `db/queries.ts` — so this touches
 * at most one aircraft's bank and this one user's attempts on it, never the
 * whole `attempts` table.
 */
export async function getSmartTestSignals(
  userId: string,
  aircraftCode: string,
  topics: string[] = [],
): Promise<QuestionSignal[]> {
  const db = getDb();
  const code = aircraftCode.toUpperCase();

  const ranked = db.$with("smart_test_ranked").as(
    db
      .select({
        questionId: attempts.questionId,
        isCorrect: attempts.isCorrect,
        answeredAt: attempts.answeredAt,
        rn: sql<number>`row_number() over (
          partition by ${attempts.questionId}
          order by ${attempts.answeredAt} desc
        )`.as("rn"),
        breakGroup: sql<number>`sum(case when ${attempts.isCorrect} then 0 else 1 end) over (
          partition by ${attempts.questionId}
          order by ${attempts.answeredAt} desc
          rows unbounded preceding
        )`.as("break_group"),
      })
      .from(attempts)
      .where(and(eq(attempts.userId, userId), eq(attempts.aircraftCode, code))),
  );

  const perQuestion = db.$with("smart_test_per_question").as(
    db
      .with(ranked)
      .select({
        questionId: ranked.questionId,
        // `rn = 1` matches exactly one row per question, so this `bool_or`
        // and `max` are just that row's own values, picked out with a
        // `filter` rather than a second join.
        lastCorrect: sql<boolean>`bool_or(${ranked.isCorrect}) filter (where ${ranked.rn} = 1)`.as(
          "last_correct",
        ),
        lastAnsweredAt: sql<Date>`max(${ranked.answeredAt}) filter (where ${ranked.rn} = 1)`.as(
          "last_answered_at",
        ),
        correctStreak: sql<number>`count(*) filter (where ${ranked.breakGroup} = 0)`.as(
          "correct_streak",
        ),
      })
      .from(ranked)
      .groupBy(ranked.questionId),
  );

  const rows = await db
    .with(ranked, perQuestion)
    .select({
      questionId: questions.id,
      neverSeen: sql<boolean>`${perQuestion.questionId} is null`,
      lastCorrect: perQuestion.lastCorrect,
      lastAnsweredAt: perQuestion.lastAnsweredAt,
      correctStreak: sql<number>`coalesce(${perQuestion.correctStreak}, 0)::int`,
      flagged: sql<boolean>`${questionFlags.id} is not null`,
    })
    .from(questions)
    .leftJoin(perQuestion, eq(perQuestion.questionId, questions.id))
    .leftJoin(
      questionFlags,
      and(eq(questionFlags.userId, userId), eq(questionFlags.questionId, questions.id)),
    )
    .where(
      and(
        eq(questions.aircraftCode, code),
        eq(questions.status, "published"),
        topics.length > 0 ? inArray(questions.topic, topics) : undefined,
      ),
    );

  return rows.map((row) => ({
    questionId: row.questionId,
    neverSeen: row.neverSeen,
    lastCorrect: row.neverSeen ? null : row.lastCorrect,
    lastAnsweredAt: row.lastAnsweredAt ? new Date(row.lastAnsweredAt) : null,
    correctStreak: Number(row.correctStreak),
    flagged: row.flagged,
  }));
}
