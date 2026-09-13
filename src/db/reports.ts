import "server-only";

import { and, asc, count, desc, eq, isNotNull, max, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { aircraft, attempts, questions, testSessions } from "@/db/schema";
import { percentage } from "@/lib/grading";

/**
 * Reading the attempt log.
 *
 * Every query here takes a `userId` and filters on it. That is the one rule
 * this file cannot bend: a report is somebody's private study history, and a
 * missing user filter would show it to the wrong person.
 *
 * `aircraftCode` is optional throughout — omitted gives the overall view,
 * supplied scopes the same report to one type, as the brief requires.
 *
 * A test session now exists from the first question answered, not only once
 * it is finished — see the note on `attempts` in the schema. That split
 * matters here: queries that read straight from `attempts` (the summary's
 * answered/correct counts, topic performance, the retry list) count a
 * question the moment it is answered, abandoned test included, because that
 * answer really happened and is worth showing. Queries that read
 * `testSessions` — "tests taken", "progress over time" — only ever count a
 * *finished* one: an in-progress session has no score to plot and is not yet
 * a "test taken", so both filter on `completedAt is not null`.
 */

function scope(userId: string, aircraftCode?: string) {
  return aircraftCode
    ? and(eq(attempts.userId, userId), eq(attempts.aircraftCode, aircraftCode))
    : eq(attempts.userId, userId);
}

export type ProgressSummary = {
  answered: number;
  correct: number;
  percentage: number;
  /** Distinct questions seen, which is not the same as answers given. */
  questionsSeen: number;
  testsTaken: number;
  lastPractised: Date | null;
};

export async function getSummary(
  userId: string,
  aircraftCode?: string,
): Promise<ProgressSummary> {
  const db = getDb();

  const [totals] = await db
    .select({
      answered: count(),
      correct: sql<number>`count(*) filter (where ${attempts.isCorrect})::int`,
      questionsSeen: sql<number>`count(distinct ${attempts.questionId})::int`,
      lastPractised: max(attempts.answeredAt),
    })
    .from(attempts)
    .where(scope(userId, aircraftCode));

  const [tests] = await db
    .select({ testsTaken: count() })
    .from(testSessions)
    .where(
      and(
        eq(testSessions.userId, userId),
        isNotNull(testSessions.completedAt),
        aircraftCode ? eq(testSessions.aircraftCode, aircraftCode) : undefined,
      ),
    );

  const answered = Number(totals?.answered ?? 0);
  const correct = Number(totals?.correct ?? 0);

  return {
    answered,
    correct,
    percentage: percentage(correct, answered),
    questionsSeen: Number(totals?.questionsSeen ?? 0),
    testsTaken: Number(tests?.testsTaken ?? 0),
    lastPractised: totals?.lastPractised ? new Date(totals.lastPractised) : null,
  };
}

export type TopicPerformance = {
  topic: string;
  answered: number;
  correct: number;
  percentage: number;
};

/**
 * Performance by topic — the brief calls this the most important view, because
 * it is the one that tells a pilot what to study next.
 *
 * Weakest first, for the same reason.
 */
export async function getTopicPerformance(
  userId: string,
  aircraftCode?: string,
): Promise<TopicPerformance[]> {
  const rows = await getDb()
    .select({
      topic: attempts.topic,
      answered: count(),
      correct: sql<number>`count(*) filter (where ${attempts.isCorrect})::int`,
    })
    .from(attempts)
    .where(scope(userId, aircraftCode))
    .groupBy(attempts.topic)
    .orderBy(attempts.topic);

  return rows
    .map((row) => {
      const answered = Number(row.answered);
      const correct = Number(row.correct);
      return { topic: row.topic, answered, correct, percentage: percentage(correct, answered) };
    })
    .sort((a, b) => a.percentage - b.percentage || a.topic.localeCompare(b.topic));
}

export type TestScore = {
  testSessionId: string;
  aircraftCode: string;
  completedAt: Date;
  answered: number;
  correct: number;
  percentage: number;
};

/**
 * One point per finished test, oldest first, for the progress chart.
 *
 * The denominator is the number of attempts actually recorded rather than the
 * session's `questionCount`: the attempt rows are the source of truth, and the
 * two agreeing is a property of the writer, not something a report should
 * assume.
 */
export async function getProgressOverTime(
  userId: string,
  aircraftCode?: string,
  limit = 100,
): Promise<TestScore[]> {
  const rows = await getDb()
    .select({
      testSessionId: testSessions.id,
      aircraftCode: testSessions.aircraftCode,
      completedAt: testSessions.completedAt,
      answered: count(attempts.id),
      correct: sql<number>`count(*) filter (where ${attempts.isCorrect})::int`,
    })
    .from(testSessions)
    .innerJoin(attempts, eq(attempts.testSessionId, testSessions.id))
    .where(
      and(
        eq(testSessions.userId, userId),
        isNotNull(testSessions.completedAt),
        aircraftCode ? eq(testSessions.aircraftCode, aircraftCode) : undefined,
      ),
    )
    .groupBy(testSessions.id)
    .orderBy(asc(testSessions.completedAt))
    .limit(limit);

  return rows.map((row) => {
    const answered = Number(row.answered);
    const correct = Number(row.correct);
    return {
      testSessionId: row.testSessionId,
      aircraftCode: row.aircraftCode,
      // Never null: the `isNotNull` filter above guarantees it.
      completedAt: new Date(row.completedAt as Date),
      answered,
      correct,
      percentage: percentage(correct, answered),
    };
  });
}

export type QuestionToRetry = {
  questionId: string;
  aircraftCode: string;
  topic: string;
  question: string;
  lastAnsweredAt: Date;
  timesWrong: number;
};

/**
 * Questions whose **most recent** answer was wrong.
 *
 * Deliberately not "ever got wrong": a question you have since answered
 * correctly is not something to drill again, and a retry list that never
 * shrinks is one nobody uses.
 *
 * Joining to `questions` is what drops entries whose content file has since
 * been deleted — the attempt row survives for the totals, but there is nothing
 * left to re-ask.
 */
export async function getQuestionsToRetry(
  userId: string,
  aircraftCode?: string,
  limit = 100,
): Promise<QuestionToRetry[]> {
  const db = getDb();

  const ranked = db
    .$with("ranked")
    .as(
      db
        .select({
          questionId: attempts.questionId,
          aircraftCode: attempts.aircraftCode,
          topic: attempts.topic,
          isCorrect: attempts.isCorrect,
          answeredAt: attempts.answeredAt,
          rank: sql<number>`row_number() over (
            partition by ${attempts.questionId}
            order by ${attempts.answeredAt} desc
          )`.as("rank"),
          timesWrong: sql<number>`count(*) filter (where not ${attempts.isCorrect}) over (
            partition by ${attempts.questionId}
          )`.as("times_wrong"),
        })
        .from(attempts)
        .where(scope(userId, aircraftCode)),
    );

  const rows = await db
    .with(ranked)
    .select({
      questionId: ranked.questionId,
      aircraftCode: ranked.aircraftCode,
      topic: ranked.topic,
      lastAnsweredAt: ranked.answeredAt,
      timesWrong: ranked.timesWrong,
      question: questions.question,
    })
    .from(ranked)
    // Inner join: a question removed from content drops out of the retry list.
    .innerJoin(questions, eq(questions.id, ranked.questionId))
    .where(
      and(
        eq(ranked.rank, 1),
        eq(ranked.isCorrect, false),
        // Never offer a draft question to retry.
        eq(questions.status, "published"),
      ),
    )
    .orderBy(desc(ranked.answeredAt))
    .limit(limit);

  return rows.map((row) => ({
    questionId: row.questionId,
    aircraftCode: row.aircraftCode,
    topic: row.topic,
    question: row.question,
    lastAnsweredAt: new Date(row.lastAnsweredAt),
    timesWrong: Number(row.timesWrong),
  }));
}

/** Just the ids, for building a retry test. */
export async function getQuestionIdsToRetry(
  userId: string,
  aircraftCode: string,
  limit: number,
): Promise<string[]> {
  const rows = await getQuestionsToRetry(userId, aircraftCode, limit);
  return rows.map((row) => row.questionId);
}

export type PractisedAircraft = {
  code: string;
  name: string;
  answered: number;
  correct: number;
  percentage: number;
};

/** The aircraft this user has actually practised, for the overall page. */
export async function getPractisedAircraft(userId: string): Promise<PractisedAircraft[]> {
  const rows = await getDb()
    .select({
      code: attempts.aircraftCode,
      name: aircraft.name,
      answered: count(),
      correct: sql<number>`count(*) filter (where ${attempts.isCorrect})::int`,
    })
    .from(attempts)
    // Left join: history for an aircraft whose content was removed still counts,
    // it just has no name to show.
    .leftJoin(aircraft, eq(aircraft.code, attempts.aircraftCode))
    .where(eq(attempts.userId, userId))
    .groupBy(attempts.aircraftCode, aircraft.name)
    .orderBy(attempts.aircraftCode);

  return rows.map((row) => {
    const answered = Number(row.answered);
    const correct = Number(row.correct);
    return {
      code: row.code,
      name: row.name ?? row.code,
      answered,
      correct,
      percentage: percentage(correct, answered),
    };
  });
}
