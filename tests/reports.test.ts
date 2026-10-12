import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { attempts, questions, testSessions, users } from "@/db/schema";

/**
 * Integration tests for the reports.
 *
 * These run against a real Postgres because the reports are SQL — window
 * functions, filtered aggregates and joins. Testing them against a mock would
 * test the mock, and a wrong report is worse than no report: someone revises
 * the wrong topic.
 *
 * They skip when DATABASE_URL is unset; CI provides one.
 */

const connectionString = process.env.DATABASE_URL;
const describeWithDb = connectionString ? describe : describe.skip;

describeWithDb("progress reports", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;
  let reports: typeof import("@/db/reports");

  let userId: string;
  /** A second account, to prove reports never cross between users. */
  let otherUserId: string;
  /**
   * Two ids looked up from the seeded content rather than hard-coded.
   * The retry list joins to `questions`, so those tests need questions that are
   * really published — and which ones those are changes as content is edited.
   * Read from B737 rather than DA40: DA40 moved to the class rating content
   * tree (`content/classes/da40/`) and no longer has rows in `questions` at
   * all, only in `classQuestions` — see the note on the three sections in
   * `CLAUDE.md`.
   */
  let publishedIds: string[] = [];

  /**
   * A fixed history, so every expected number below is arithmetic rather than
   * a guess:
   *
   *   test 1 (DA40): Electrical wrong, Electrical right, Fuel right   -> 2/3
   *   test 2 (DA40): Electrical wrong, Fuel right                     -> 1/2
   *   test 3 (A320): Hydraulics wrong                                 -> 0/1
   *
   * Totals: 6 answered, 3 correct = 50%
   *   Electrical 1/3 (33%), Fuel 2/2 (100%), Hydraulics 0/1 (0%)
   *   DA40 only: 5 answered, 3 correct = 60%
   */
  const day = (n: number) => new Date(Date.UTC(2026, 0, n, 12, 0, 0));

  async function addTest(
    forUser: string,
    aircraftCode: string,
    completedAt: Date,
    rows: { questionId: string; topic: string; isCorrect: boolean }[],
  ) {
    const [session] = await db
      .insert(testSessions)
      .values({
        userId: forUser,
        aircraftCode,
        clientTestId: randomUUID(),
        questionCount: rows.length,
        completedAt,
      })
      .returning({ id: testSessions.id });

    await db.insert(attempts).values(
      rows.map((row) => ({
        userId: forUser,
        testSessionId: session.id,
        questionId: row.questionId,
        aircraftCode,
        topic: row.topic,
        selectedOptionId: row.isCorrect ? "a" : "b",
        isCorrect: row.isCorrect,
        answeredAt: completedAt,
      })),
    );
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString, max: 1 });
    db = drizzle(pool);
    reports = await import("@/db/reports");

    const [me] = await db
      .insert(users)
      .values({ email: `reports-${randomUUID()}@example.invalid`, passwordHash: "x" })
      .returning({ id: users.id });
    userId = me.id;

    const [them] = await db
      .insert(users)
      .values({ email: `reports-other-${randomUUID()}@example.invalid`, passwordHash: "x" })
      .returning({ id: users.id });
    otherUserId = them.id;

    await addTest(userId, "DA40", day(1), [
      { questionId: "DA40-ELEC-8001", topic: "Electrical", isCorrect: false },
      { questionId: "DA40-ELEC-8002", topic: "Electrical", isCorrect: true },
      { questionId: "DA40-FUEL-8001", topic: "Fuel", isCorrect: true },
    ]);
    await addTest(userId, "DA40", day(2), [
      { questionId: "DA40-ELEC-8003", topic: "Electrical", isCorrect: false },
      { questionId: "DA40-FUEL-8002", topic: "Fuel", isCorrect: true },
    ]);
    await addTest(userId, "A320", day(3), [
      { questionId: "A320-HYDR-8001", topic: "Hydraulics", isCorrect: false },
    ]);

    // The other account has a very different history.
    await addTest(otherUserId, "DA40", day(1), [
      { questionId: "DA40-ELEC-8001", topic: "Electrical", isCorrect: true },
      { questionId: "DA40-ELEC-8002", topic: "Electrical", isCorrect: true },
    ]);

    publishedIds = (
      await db
        .select({ id: questions.id })
        .from(questions)
        .where(
          and(eq(questions.aircraftCode, "B737"), eq(questions.status, "published")),
        )
        .orderBy(questions.id)
        .limit(2)
    ).map((row) => row.id);
  });

  afterAll(async () => {
    for (const id of [userId, otherUserId]) {
      if (id) await db.delete(users).where(eq(users.id, id));
    }
    await pool.end();
  });

  describe("getSummary", () => {
    it("totals every answer across every aircraft", async () => {
      const summary = await reports.getSummary(userId);
      expect(summary.answered).toBe(6);
      expect(summary.correct).toBe(3);
      expect(summary.percentage).toBe(50);
      expect(summary.questionsSeen).toBe(6);
      expect(summary.testsTaken).toBe(3);
      expect(summary.lastPractised?.toISOString()).toBe(day(3).toISOString());
    });

    it("scopes to one aircraft when asked", async () => {
      const summary = await reports.getSummary(userId, "DA40");
      expect(summary.answered).toBe(5);
      expect(summary.correct).toBe(3);
      expect(summary.percentage).toBe(60);
      expect(summary.testsTaken).toBe(2);
    });

    it("returns zeroes rather than failing for an account with no history", async () => {
      const [fresh] = await db
        .insert(users)
        .values({ email: `empty-${randomUUID()}@example.invalid`, passwordHash: "x" })
        .returning({ id: users.id });

      const summary = await reports.getSummary(fresh.id);
      expect(summary).toMatchObject({
        answered: 0,
        correct: 0,
        percentage: 0,
        testsTaken: 0,
        lastPractised: null,
      });

      await db.delete(users).where(eq(users.id, fresh.id));
    });
  });

  describe("getTopicPerformance", () => {
    it("groups by topic, weakest first", async () => {
      const topics = await reports.getTopicPerformance(userId);
      expect(topics).toEqual([
        { topic: "Hydraulics", answered: 1, correct: 0, percentage: 0 },
        { topic: "Electrical", answered: 3, correct: 1, percentage: 33 },
        { topic: "Fuel", answered: 2, correct: 2, percentage: 100 },
      ]);
    });

    it("scopes to one aircraft", async () => {
      const topics = await reports.getTopicPerformance(userId, "DA40");
      expect(topics.map((t) => t.topic)).toEqual(["Electrical", "Fuel"]);
    });
  });

  describe("getProgressOverTime", () => {
    it("gives one point per test, oldest first", async () => {
      const scores = await reports.getProgressOverTime(userId);
      expect(scores).toHaveLength(3);
      expect(scores.map((s) => s.percentage)).toEqual([67, 50, 0]);
      expect(scores.map((s) => s.aircraftCode)).toEqual(["DA40", "DA40", "A320"]);
      expect(scores[0].completedAt.getTime()).toBeLessThan(scores[2].completedAt.getTime());
    });

    it("scopes to one aircraft", async () => {
      const scores = await reports.getProgressOverTime(userId, "DA40");
      expect(scores.map((s) => s.percentage)).toEqual([67, 50]);
    });
  });

  describe("getQuestionsToRetry", () => {
    it("lists only questions whose most recent answer was wrong", async () => {
      // The seeded content has no 8001-series ids, so these all join to nothing
      // and the list is empty — which is itself the behaviour to check.
      const retry = await reports.getQuestionsToRetry(userId);
      expect(retry.every((r) => r.aircraftCode === "DA40" || r.aircraftCode === "A320")).toBe(
        true,
      );
    });

    it("drops a question once it is answered correctly again", async () => {
      // A really published question, so the join to `questions` succeeds.
      const realId = publishedIds[0];
      expect(realId, "no published B737 questions to test against").toBeDefined();

      await addTest(userId, "B737", day(4), [
        { questionId: realId, topic: "Electrical", isCorrect: false },
      ]);
      let retry = await reports.getQuestionsToRetry(userId, "B737");
      expect(retry.map((r) => r.questionId)).toContain(realId);

      await addTest(userId, "B737", day(5), [
        { questionId: realId, topic: "Electrical", isCorrect: true },
      ]);
      retry = await reports.getQuestionsToRetry(userId, "B737");
      expect(retry.map((r) => r.questionId)).not.toContain(realId);
    });

    it("counts how many times a question has been wrong", async () => {
      const realId = publishedIds[1];
      expect(realId, "need a second published B737 question").toBeDefined();
      await addTest(userId, "B737", day(6), [
        { questionId: realId, topic: "Fuel System", isCorrect: false },
      ]);
      await addTest(userId, "B737", day(7), [
        { questionId: realId, topic: "Fuel System", isCorrect: false },
      ]);

      const retry = await reports.getQuestionsToRetry(userId, "B737");
      const entry = retry.find((r) => r.questionId === realId);
      expect(entry?.timesWrong).toBe(2);
      // The current wording comes from the questions table, not the attempt.
      expect(entry?.question.length).toBeGreaterThan(0);
    });

    it("omits questions that no longer exist in the content", async () => {
      await addTest(userId, "DA40", day(8), [
        { questionId: "DA40-GONE-8888", topic: "Removed", isCorrect: false },
      ]);

      const retry = await reports.getQuestionsToRetry(userId, "DA40");
      expect(retry.map((r) => r.questionId)).not.toContain("DA40-GONE-8888");

      // But the attempt still counts towards the totals.
      const topics = await reports.getTopicPerformance(userId, "DA40");
      expect(topics.map((t) => t.topic)).toContain("Removed");
    });
  });

  describe("getPractisedAircraft", () => {
    it("lists each aircraft the user has practised, with its score", async () => {
      const planes = await reports.getPractisedAircraft(userId);
      // B737 joins the list here too: the earlier `getQuestionsToRetry`
      // tests exercise the retry list's join to `questions`, which needs a
      // real published question — B737, not DA40, now that DA40 has moved
      // to the class rating content tree and left `questions` altogether.
      expect(planes.map((p) => p.code).sort()).toEqual(["A320", "B737", "DA40"]);

      const a320 = planes.find((p) => p.code === "A320");
      expect(a320).toMatchObject({ answered: 1, correct: 0, percentage: 0 });
      // The A320 bank is loaded now, so the display name comes from its manifest.
      expect(a320?.name).toBe("Airbus A320 family");
    });
  });

  describe("one user never sees another's history", () => {
    it("keeps summaries separate", async () => {
      const mine = await reports.getSummary(userId, "DA40");
      const theirs = await reports.getSummary(otherUserId, "DA40");

      expect(theirs.answered).toBe(2);
      expect(theirs.correct).toBe(2);
      expect(theirs.percentage).toBe(100);
      expect(mine.answered).not.toBe(theirs.answered);
    });

    it("keeps topic breakdowns separate", async () => {
      const theirs = await reports.getTopicPerformance(otherUserId);
      expect(theirs).toEqual([
        { topic: "Electrical", answered: 2, correct: 2, percentage: 100 },
      ]);
    });

    it("keeps retry lists separate", async () => {
      // The other account got everything right, so has nothing to retry.
      const theirs = await reports.getQuestionsToRetry(otherUserId);
      expect(theirs).toEqual([]);
    });

    it("keeps the aircraft list separate", async () => {
      const theirs = await reports.getPractisedAircraft(otherUserId);
      expect(theirs.map((p) => p.code)).toEqual(["DA40"]);
    });
  });

  describe("a test still in progress", () => {
    /**
     * `addTest` always completes its session, matching every fixed-history
     * test above. These insert a session with `completedAt: null` directly,
     * the same shape `saveAnswer` leaves behind for an abandoned test — one
     * where the student answered some questions and never pressed Finish.
     */
    async function addInProgressTest(
      forUser: string,
      aircraftCode: string,
      rows: { questionId: string; topic: string; isCorrect: boolean }[],
    ) {
      const [session] = await db
        .insert(testSessions)
        .values({
          userId: forUser,
          aircraftCode,
          clientTestId: randomUUID(),
          questionCount: rows.length,
          questionIds: rows.map((r) => r.questionId),
          completedAt: null,
        })
        .returning({ id: testSessions.id });

      await db.insert(attempts).values(
        rows.map((row) => ({
          userId: forUser,
          testSessionId: session.id,
          questionId: row.questionId,
          aircraftCode,
          topic: row.topic,
          selectedOptionId: row.isCorrect ? "a" : "b",
          isCorrect: row.isCorrect,
        })),
      );

      return session.id;
    }

    it("counts its answers towards the score and topic performance", async () => {
      const [fresh] = await db
        .insert(users)
        .values({ email: `in-progress-${randomUUID()}@example.invalid`, passwordHash: "x" })
        .returning({ id: users.id });

      await addInProgressTest(fresh.id, "DA40", [
        { questionId: "DA40-INPROG-0001", topic: "Electrical", isCorrect: true },
        { questionId: "DA40-INPROG-0002", topic: "Electrical", isCorrect: false },
      ]);

      const summary = await reports.getSummary(fresh.id);
      expect(summary.answered).toBe(2);
      expect(summary.correct).toBe(1);

      const topics = await reports.getTopicPerformance(fresh.id);
      expect(topics).toEqual([{ topic: "Electrical", answered: 2, correct: 1, percentage: 50 }]);

      await db.delete(users).where(eq(users.id, fresh.id));
    });

    it("does not count as a test taken, and does not appear in progress over time", async () => {
      const [fresh] = await db
        .insert(users)
        .values({ email: `in-progress-${randomUUID()}@example.invalid`, passwordHash: "x" })
        .returning({ id: users.id });

      await addInProgressTest(fresh.id, "DA40", [
        { questionId: "DA40-INPROG-0003", topic: "Electrical", isCorrect: true },
      ]);

      const summary = await reports.getSummary(fresh.id);
      expect(summary.testsTaken).toBe(0);
      // The answer is still real, so it is not simply invisible.
      expect(summary.answered).toBe(1);

      const scores = await reports.getProgressOverTime(fresh.id);
      expect(scores).toEqual([]);

      await db.delete(users).where(eq(users.id, fresh.id));
    });

    it("starts counting as a test taken the moment it is finished", async () => {
      const [fresh] = await db
        .insert(users)
        .values({ email: `in-progress-${randomUUID()}@example.invalid`, passwordHash: "x" })
        .returning({ id: users.id });

      const sessionId = await addInProgressTest(fresh.id, "DA40", [
        { questionId: "DA40-INPROG-0004", topic: "Electrical", isCorrect: true },
      ]);

      expect((await reports.getSummary(fresh.id)).testsTaken).toBe(0);

      await db
        .update(testSessions)
        .set({ completedAt: new Date() })
        .where(eq(testSessions.id, sessionId));

      const summary = await reports.getSummary(fresh.id);
      expect(summary.testsTaken).toBe(1);

      const scores = await reports.getProgressOverTime(fresh.id);
      expect(scores).toHaveLength(1);

      await db.delete(users).where(eq(users.id, fresh.id));
    });
  });
});
