import "server-only";

import { and, asc, count, desc, eq, isNotNull, max, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { aircraft, attempts, questions, testSessions } from "@/db/schema";
import { getAnswerKey, type AnswerKeyQuestion } from "@/db/queries";
import { gradeTest, percentage, type TestResult } from "@/lib/grading";
import type { TestMode } from "@/lib/test-options";

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

export type TestHistoryEntry = {
  testSessionId: string;
  aircraftCode: string;
  /** Falls back to the code when the aircraft's own row is gone. */
  aircraftName: string;
  /** Null only pre-migration; read as `study`, same as everywhere else. */
  mode: TestMode;
  completedAt: Date;
  /** Null only pre-migration, when the clock was not yet tracked. */
  timeTakenSeconds: number | null;
  answered: number;
  correct: number;
  percentage: number;
};

/**
 * Every finished test, most recent first — the dashboard's exam history
 * table, and (its first `n` entries, reversed) the score-trend chart beside
 * it. One query: `attempts` is aggregated per session in the same query
 * that reads the session's own columns, rather than a session query
 * followed by one attempt query per row.
 */
export async function getTestHistory(userId: string, limit = 20): Promise<TestHistoryEntry[]> {
  const rows = await getDb()
    .select({
      testSessionId: testSessions.id,
      aircraftCode: testSessions.aircraftCode,
      aircraftName: aircraft.name,
      mode: testSessions.mode,
      completedAt: testSessions.completedAt,
      startedAt: testSessions.startedAt,
      answered: count(attempts.id),
      correct: sql<number>`count(*) filter (where ${attempts.isCorrect})::int`,
    })
    .from(testSessions)
    .innerJoin(attempts, eq(attempts.testSessionId, testSessions.id))
    .leftJoin(aircraft, eq(aircraft.code, testSessions.aircraftCode))
    .where(and(eq(testSessions.userId, userId), isNotNull(testSessions.completedAt)))
    .groupBy(testSessions.id, aircraft.name)
    .orderBy(desc(testSessions.completedAt))
    .limit(limit);

  return rows.map((row) => {
    const answered = Number(row.answered);
    const correct = Number(row.correct);
    return {
      testSessionId: row.testSessionId,
      aircraftCode: row.aircraftCode,
      aircraftName: row.aircraftName ?? row.aircraftCode,
      mode: row.mode ?? "study",
      // Never null: the `isNotNull` filter above guarantees it.
      completedAt: new Date(row.completedAt as Date),
      timeTakenSeconds:
        row.startedAt && row.completedAt
          ? Math.round((row.completedAt.getTime() - row.startedAt.getTime()) / 1000)
          : null,
      answered,
      correct,
      percentage: percentage(correct, answered),
    };
  });
}

export type TestSessionReview = {
  testSessionId: string;
  aircraftCode: string;
  mode: TestMode;
  completedAt: Date;
  timeTakenSeconds: number | null;
  result: TestResult;
};

/**
 * The full, question-by-question record of one finished test — what an
 * exam history row links to.
 *
 * Scoped to `userId` in the lookup itself, so a session id that belongs to
 * someone else, or one still in progress, is indistinguishable from one
 * that does not exist. Reuses `gradeTest` — the same pure function that
 * graded this test the moment it was submitted — over the answer key
 * re-read fresh from `questions` and the answers actually recorded, rather
 * than storing a second, denormalised copy of the result anywhere.
 *
 * A question deleted from content since this test was taken simply drops
 * out of the review, the same "skip what no longer exists" rule every other
 * report in this file follows.
 */
export async function getTestSessionReview(
  userId: string,
  testSessionId: string,
): Promise<TestSessionReview | null> {
  const [session] = await getDb()
    .select({
      id: testSessions.id,
      aircraftCode: testSessions.aircraftCode,
      mode: testSessions.mode,
      startedAt: testSessions.startedAt,
      completedAt: testSessions.completedAt,
      questionIds: testSessions.questionIds,
    })
    .from(testSessions)
    .where(
      and(
        eq(testSessions.id, testSessionId),
        eq(testSessions.userId, userId),
        isNotNull(testSessions.completedAt),
      ),
    )
    .limit(1);

  if (!session) return null;

  const [key, answerRows] = await Promise.all([
    getAnswerKey(session.aircraftCode, session.questionIds),
    getDb()
      .select({ questionId: attempts.questionId, selectedOptionId: attempts.selectedOptionId })
      .from(attempts)
      .where(eq(attempts.testSessionId, session.id)),
  ]);

  const keyById = new Map(key.map((question) => [question.id, question]));
  // The order the student actually saw them in, minus anything since deleted.
  const orderedQuestions = session.questionIds
    .map((id) => keyById.get(id))
    .filter((question): question is AnswerKeyQuestion => question !== undefined);

  const answers = answerRows.map((row) => ({
    questionId: row.questionId,
    selectedOptionId: row.selectedOptionId,
  }));

  const result = gradeTest(session.aircraftCode, orderedQuestions, answers);

  return {
    testSessionId: session.id,
    aircraftCode: session.aircraftCode,
    mode: session.mode ?? "study",
    completedAt: session.completedAt as Date,
    timeTakenSeconds:
      session.startedAt && session.completedAt
        ? Math.round((session.completedAt.getTime() - session.startedAt.getTime()) / 1000)
        : null,
    result,
  };
}
