import "server-only";

import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { aircraft, attempts, questions, testSessions } from "@/db/schema";
import { percentage } from "@/lib/grading";

/**
 * The dashboard's own aggregates: mastery, streak, study time and "what to
 * pick up next" — none of it fits `reports.ts` (which reads *attempts and
 * scores*) or `queries.ts` (which reads *questions for a test*) cleanly, so
 * it lives here instead of being wedged into either.
 *
 * Every query still takes a `userId` and filters on it, the one rule
 * `reports.ts` states and this file inherits without restating it five
 * times over.
 */

export type SystemMastery = {
  aircraftCode: string;
  aircraftName: string;
  topic: string;
  /** Published questions in this system. */
  total: number;
  /** Of those, how many the student's most recent attempt got right. */
  mastered: number;
  /** Of those, how many the student has attempted at all — mastered or not.
   * A system with zero here is one this student has never opened, which the
   * dashboard uses to leave it out rather than show it as a wall of zeros. */
  attempted: number;
  percentage: number;
};

/**
 * Mastery per system: of every published question in that topic, how many
 * does this student's *most recent* attempt get right — not "ever
 * answered", "ever got right once and never mind since".
 *
 * One query. `ranked` numbers this user's attempts on each question
 * newest-first (same technique as `getQuestionsToRetry` and
 * `getSmartTestSignals`); `last` keeps only the top-ranked row per question,
 * i.e. its most recent outcome; the outer query then left joins every
 * published question onto that, which is what makes a question with *no*
 * attempt count in the denominator without counting as mastered — a
 * question this student has never touched is not "mastered", but it is
 * still one of the questions the topic's total is out of.
 */
export async function getSystemMastery(userId: string): Promise<SystemMastery[]> {
  const db = getDb();

  const ranked = db.$with("mastery_ranked").as(
    db
      .select({
        questionId: attempts.questionId,
        isCorrect: attempts.isCorrect,
        rn: sql<number>`row_number() over (
          partition by ${attempts.questionId}
          order by ${attempts.answeredAt} desc
        )`.as("rn"),
      })
      .from(attempts)
      .where(eq(attempts.userId, userId)),
  );

  const last = db.$with("mastery_last").as(
    db
      .with(ranked)
      .select({ questionId: ranked.questionId, isCorrect: ranked.isCorrect })
      .from(ranked)
      .where(eq(ranked.rn, 1)),
  );

  const rows = await db
    .with(ranked, last)
    .select({
      aircraftCode: questions.aircraftCode,
      aircraftName: aircraft.name,
      topic: questions.topic,
      total: sql<number>`count(*)::int`,
      mastered: sql<number>`count(*) filter (where ${last.isCorrect})::int`,
      attempted: sql<number>`count(*) filter (where ${last.questionId} is not null)::int`,
    })
    .from(questions)
    .innerJoin(aircraft, eq(aircraft.code, questions.aircraftCode))
    .leftJoin(last, eq(last.questionId, questions.id))
    .where(eq(questions.status, "published"))
    .groupBy(questions.aircraftCode, aircraft.name, questions.topic);

  return rows
    .map((row) => ({
      aircraftCode: row.aircraftCode,
      aircraftName: row.aircraftName,
      topic: row.topic,
      total: Number(row.total),
      mastered: Number(row.mastered),
      attempted: Number(row.attempted),
      percentage: percentage(Number(row.mastered), Number(row.total)),
    }))
    .sort((a, b) => a.percentage - b.percentage || a.topic.localeCompare(b.topic));
}

export type AircraftMastery = {
  aircraftCode: string;
  aircraftName: string;
  total: number;
  mastered: number;
  /** Whether this student has attempted anything on this aircraft at all —
   * see the note on `SystemMastery.attempted`. */
  attempted: number;
  percentage: number;
};

/**
 * The same mastery figure, rolled up per aircraft rather than per system —
 * derived from `getSystemMastery`'s rows in memory rather than a second
 * query, since there are only ever as many rows as there are (aircraft,
 * topic) pairs, a few dozen at most.
 */
export async function getAircraftMastery(userId: string): Promise<AircraftMastery[]> {
  const systems = await getSystemMastery(userId);

  const byAircraft = new Map<string, AircraftMastery>();
  for (const system of systems) {
    const existing = byAircraft.get(system.aircraftCode);
    if (existing) {
      existing.total += system.total;
      existing.mastered += system.mastered;
      existing.attempted += system.attempted;
    } else {
      byAircraft.set(system.aircraftCode, {
        aircraftCode: system.aircraftCode,
        aircraftName: system.aircraftName,
        total: system.total,
        mastered: system.mastered,
        attempted: system.attempted,
        percentage: 0,
      });
    }
  }

  return [...byAircraft.values()]
    .map((entry) => ({ ...entry, percentage: percentage(entry.mastered, entry.total) }))
    .sort((a, b) => a.aircraftCode.localeCompare(b.aircraftCode));
}

/**
 * Every distinct calendar day this student has answered at least one
 * question, most recent first — the raw material for the streak count in
 * `computeStudyStreak` (`lib/streak.ts`). Capped at a year of days: a streak
 * can never run longer than that anyway before today would already have
 * broken it, so nothing past this bound is ever worth reading.
 */
export async function getPracticeDates(userId: string): Promise<Date[]> {
  const rows = await getDb()
    .selectDistinct({ day: sql<Date>`date_trunc('day', ${attempts.answeredAt})`.as("day") })
    .from(attempts)
    .where(eq(attempts.userId, userId))
    .orderBy(desc(sql`day`))
    .limit(366);

  return rows.map((row) => new Date(row.day));
}

/**
 * Total time spent in finished tests, in seconds — the sum of
 * `completedAt - startedAt` over every completed session. `startedAt` is
 * null only for a handful of rows written before it was tracked at all
 * (see the note on `test_sessions.startedAt` in `schema.ts`); those
 * contribute nothing rather than a wrong guess.
 */
export async function getTotalStudyTimeSeconds(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({
      seconds: sql<number>`coalesce(sum(extract(epoch from (${testSessions.completedAt} - ${testSessions.startedAt}))), 0)::int`,
    })
    .from(testSessions)
    .where(
      and(
        eq(testSessions.userId, userId),
        isNotNull(testSessions.completedAt),
        isNotNull(testSessions.startedAt),
      ),
    );

  return Number(row?.seconds ?? 0);
}

/**
 * The aircraft this student most recently answered a question on — what the
 * one-tap warm-up button targets. Null for a student who has never
 * answered anything yet, which the dashboard's empty state handles.
 */
export async function getMostRecentAircraftCode(userId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ aircraftCode: attempts.aircraftCode })
    .from(attempts)
    .where(eq(attempts.userId, userId))
    .orderBy(desc(attempts.answeredAt))
    .limit(1);

  return row?.aircraftCode ?? null;
}
