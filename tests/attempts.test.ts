import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { attempts, testSessions, users } from "@/db/schema";
import { gradeTest, type GradableQuestion } from "@/lib/grading";

/**
 * Integration tests for the attempt log.
 *
 * These need a real Postgres, because the guarantees under test are database
 * guarantees: the unique index that makes a repeated submission a no-op, and
 * the transaction that stops a half-written test existing. Mocking the database
 * would test the mock.
 *
 * They skip when DATABASE_URL is unset so `npm run test` still works without
 * one; CI provides a database so they always run there.
 */

const connectionString = process.env.DATABASE_URL;
const describeWithDb = connectionString ? describe : describe.skip;

if (!connectionString) {
  console.warn("DATABASE_URL is not set — skipping attempt log integration tests.");
}

describeWithDb("recordTestResult", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;
  let userId: string;
  let recordTestResult: typeof import("@/db/attempts").recordTestResult;
  let saveAnswer: typeof import("@/db/attempts").saveAnswer;
  let findSession: typeof import("@/db/attempts").findSession;
  let getSessionAnswers: typeof import("@/db/attempts").getSessionAnswers;

  const question = (id: string, topic: string, correct: string): GradableQuestion => ({
    id,
    topic,
    subtopic: null,
    question: `Question ${id}?`,
    options: [
      { id: "a", text: "Option a" },
      { id: "b", text: "Option b" },
    ],
    difficulty: 1,
    correct,
    explanation: "Because.",
    reference: null,
  });

  const questions = [
    question("DA40-ELEC-9001", "Electrical", "a"),
    question("DA40-ELEC-9002", "Electrical", "b"),
    question("DA40-FUEL-9001", "Fuel", "a"),
  ];

  beforeAll(async () => {
    pool = new Pool({ connectionString, max: 1 });
    db = drizzle(pool);

    // The module under test builds its own pool from DATABASE_URL.
    ({ recordTestResult, saveAnswer, findSession, getSessionAnswers } = await import(
      "@/db/attempts"
    ));

    const [row] = await db
      .insert(users)
      .values({ email: `attempts-test-${randomUUID()}@example.invalid`, passwordHash: "x" })
      .returning({ id: users.id });
    userId = row.id;
  });

  afterAll(async () => {
    // Attempts and sessions cascade from the user.
    if (userId) await db.delete(users).where(eq(users.id, userId));
    await pool.end();
  });

  async function sessionsFor(clientTestId: string) {
    return db
      .select()
      .from(testSessions)
      .where(
        and(eq(testSessions.userId, userId), eq(testSessions.clientTestId, clientTestId)),
      );
  }

  async function attemptsFor(testSessionId: string) {
    return db
      .select()
      .from(attempts)
      .where(eq(attempts.testSessionId, testSessionId))
      .orderBy(attempts.questionId);
  }

  it("records one row per answered question, with the outcome of each", async () => {
    const clientTestId = randomUUID();
    const result = gradeTest("DA40", questions, [
      { questionId: "DA40-ELEC-9001", selectedOptionId: "a" }, // correct
      { questionId: "DA40-ELEC-9002", selectedOptionId: "a" }, // wrong
      { questionId: "DA40-FUEL-9001", selectedOptionId: null }, // unanswered
    ]);

    const outcome = await recordTestResult(userId, clientTestId, result);
    expect(outcome.status).toBe("recorded");

    const rows = await attemptsFor(outcome.testSessionId);
    expect(rows).toHaveLength(3);

    expect(rows.map((r) => [r.questionId, r.selectedOptionId, r.isCorrect])).toEqual([
      ["DA40-ELEC-9001", "a", true],
      ["DA40-ELEC-9002", "a", false],
      // Unanswered: no selection, and counted as incorrect.
      ["DA40-FUEL-9001", null, false],
    ]);
  });

  it("stores the aircraft and the topic on every attempt", async () => {
    const clientTestId = randomUUID();
    // One question from each topic, so the topics on the rows are unambiguous.
    const result = gradeTest("DA40", [questions[0], questions[2]], [
      { questionId: "DA40-ELEC-9001", selectedOptionId: "a" },
      { questionId: "DA40-FUEL-9001", selectedOptionId: "a" },
    ]);

    const outcome = await recordTestResult(userId, clientTestId, result);
    const rows = await attemptsFor(outcome.testSessionId);

    expect(rows).toHaveLength(2);

    expect(rows.every((r) => r.aircraftCode === "DA40")).toBe(true);
    expect(rows.map((r) => r.topic).sort()).toEqual(["Electrical", "Fuel"]);
    expect(rows.every((r) => r.userId === userId)).toBe(true);
    expect(rows.every((r) => r.answeredAt instanceof Date)).toBe(true);
  });

  it("records the test session with its aircraft and question count", async () => {
    const clientTestId = randomUUID();
    const result = gradeTest("DA40", questions, [
      { questionId: "DA40-ELEC-9001", selectedOptionId: "a" },
      { questionId: "DA40-ELEC-9002", selectedOptionId: "b" },
      { questionId: "DA40-FUEL-9001", selectedOptionId: "a" },
    ]);

    await recordTestResult(userId, clientTestId, result);
    const [session] = await sessionsFor(clientTestId);

    expect(session.aircraftCode).toBe("DA40");
    expect(session.questionCount).toBe(3);
    expect(session.completedAt).toBeInstanceOf(Date);
  });

  it("counts a repeated submission of the same test once", async () => {
    const clientTestId = randomUUID();
    const result = gradeTest("DA40", questions, [
      { questionId: "DA40-ELEC-9001", selectedOptionId: "a" },
      { questionId: "DA40-ELEC-9002", selectedOptionId: "b" },
      { questionId: "DA40-FUEL-9001", selectedOptionId: "a" },
    ]);

    const first = await recordTestResult(userId, clientTestId, result);
    const second = await recordTestResult(userId, clientTestId, result);

    expect(first.status).toBe("recorded");
    expect(second.status).toBe("duplicate");
    expect(second.testSessionId).toBe(first.testSessionId);

    expect(await sessionsFor(clientTestId)).toHaveLength(1);
    expect(await attemptsFor(first.testSessionId)).toHaveLength(3);
  });

  it("survives several submissions racing each other", async () => {
    const clientTestId = randomUUID();
    const result = gradeTest("DA40", [questions[0]], [
      { questionId: "DA40-ELEC-9001", selectedOptionId: "a" },
    ]);

    // A double-click fires these concurrently, not one after the other.
    const outcomes = await Promise.allSettled(
      Array.from({ length: 4 }, () => recordTestResult(userId, clientTestId, result)),
    );

    const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThan(0);

    // However the race resolves, exactly one test is on record.
    expect(await sessionsFor(clientTestId)).toHaveLength(1);
    const [session] = await sessionsFor(clientTestId);
    expect(await attemptsFor(session.id)).toHaveLength(1);
  });

  it("keeps separate tests separate", async () => {
    const a = randomUUID();
    const b = randomUUID();
    const result = gradeTest("DA40", [questions[0]], [
      { questionId: "DA40-ELEC-9001", selectedOptionId: "a" },
    ]);

    const first = await recordTestResult(userId, a, result);
    const second = await recordTestResult(userId, b, result);

    expect(first.status).toBe("recorded");
    expect(second.status).toBe("recorded");
    expect(first.testSessionId).not.toBe(second.testSessionId);
  });

  it("does not reference the questions table, so content can be deleted freely", async () => {
    // A question id that exists in no content file at all.
    const orphan = question("DA40-GONE-9999", "Removed Topic", "a");
    const clientTestId = randomUUID();
    const result = gradeTest("DA40", [orphan], [
      { questionId: "DA40-GONE-9999", selectedOptionId: "a" },
    ]);

    const outcome = await recordTestResult(userId, clientTestId, result);
    const rows = await attemptsFor(outcome.testSessionId);

    expect(rows).toHaveLength(1);
    expect(rows[0].questionId).toBe("DA40-GONE-9999");
    // The topic snapshot is what keeps the report readable after a deletion.
    expect(rows[0].topic).toBe("Removed Topic");
  });

  describe("saveAnswer", () => {
    const answer = (over: Partial<Parameters<typeof saveAnswer>[0]> = {}) => ({
      userId,
      clientTestId: randomUUID(),
      aircraftCode: "DA40",
      questionIds: ["DA40-ELEC-9001", "DA40-ELEC-9002", "DA40-FUEL-9001"],
      questionCount: 3,
      questionId: "DA40-ELEC-9001",
      topic: "Electrical",
      selectedOptionId: "a",
      isCorrect: true,
      timeLimitSeconds: null,
      ...over,
    });

    it("creates the session on the first answer, still in progress", async () => {
      const clientTestId = randomUUID();
      const outcome = await saveAnswer(answer({ clientTestId }));
      expect(outcome.status).toBe("recorded");

      const [session] = await sessionsFor(clientTestId);
      expect(session.completedAt).toBeNull();
      expect(session.aircraftCode).toBe("DA40");
      expect(session.questionIds).toEqual([
        "DA40-ELEC-9001",
        "DA40-ELEC-9002",
        "DA40-FUEL-9001",
      ]);
      expect(await attemptsFor(session.id)).toHaveLength(1);
    });

    it("replaces the same question's row rather than adding a second one", async () => {
      const clientTestId = randomUUID();
      await saveAnswer(answer({ clientTestId, questionId: "DA40-ELEC-9001", selectedOptionId: "a", isCorrect: true }));
      await saveAnswer(answer({ clientTestId, questionId: "DA40-ELEC-9001", selectedOptionId: "b", isCorrect: false }));

      const [session] = await sessionsFor(clientTestId);
      const rows = await attemptsFor(session.id);

      expect(rows).toHaveLength(1);
      expect(rows[0].selectedOptionId).toBe("b");
      expect(rows[0].isCorrect).toBe(false);
    });

    it("adds a separate row for a different question in the same test", async () => {
      const clientTestId = randomUUID();
      await saveAnswer(answer({ clientTestId, questionId: "DA40-ELEC-9001" }));
      await saveAnswer(answer({ clientTestId, questionId: "DA40-ELEC-9002", selectedOptionId: "b", isCorrect: true }));

      const [session] = await sessionsFor(clientTestId);
      const rows = await attemptsFor(session.id);
      expect(rows.map((r) => r.questionId)).toEqual(["DA40-ELEC-9001", "DA40-ELEC-9002"]);
    });

    it("survives changing an answer several times racing itself", async () => {
      const clientTestId = randomUUID();
      const outcomes = await Promise.allSettled(
        ["a", "b", "a", "b"].map((selectedOptionId) =>
          saveAnswer(answer({ clientTestId, questionId: "DA40-ELEC-9001", selectedOptionId })),
        ),
      );

      expect(outcomes.some((o) => o.status === "fulfilled")).toBe(true);

      const [session] = await sessionsFor(clientTestId);
      // Whichever call won the race, there is still exactly one row.
      expect(await attemptsFor(session.id)).toHaveLength(1);
    });

    it("refuses to write once the test is finished", async () => {
      const clientTestId = randomUUID();
      await saveAnswer(answer({ clientTestId, questionId: "DA40-ELEC-9001", selectedOptionId: "a" }));

      const result = gradeTest("DA40", questions, [
        { questionId: "DA40-ELEC-9001", selectedOptionId: "a" },
        { questionId: "DA40-ELEC-9002", selectedOptionId: "b" },
        { questionId: "DA40-FUEL-9001", selectedOptionId: "a" },
      ]);
      await recordTestResult(userId, clientTestId, result);

      // A stray call from a stale tab, after another tab already finished it.
      const outcome = await saveAnswer(
        answer({ clientTestId, questionId: "DA40-ELEC-9001", selectedOptionId: "b" }),
      );
      expect(outcome.status).toBe("closed");

      const [session] = await sessionsFor(clientTestId);
      const [row] = (await attemptsFor(session.id)).filter((r) => r.questionId === "DA40-ELEC-9001");
      // The finished answer stands; the stray write never landed.
      expect(row.selectedOptionId).toBe("a");
    });

    it("refuses to write under an id that belongs to a different aircraft", async () => {
      const clientTestId = randomUUID();
      await saveAnswer(answer({ clientTestId, aircraftCode: "DA40" }));

      const outcome = await saveAnswer(answer({ clientTestId, aircraftCode: "A320" }));
      expect(outcome.status).toBe("wrong-aircraft");

      const [session] = await sessionsFor(clientTestId);
      expect(session.aircraftCode).toBe("DA40");
    });
  });

  describe("recordTestResult after saveAnswer has already written some rows", () => {
    it("marks the session complete and fills in the question left unanswered", async () => {
      const clientTestId = randomUUID();
      await saveAnswer({
        userId,
        clientTestId,
        aircraftCode: "DA40",
        questionIds: questions.map((q) => q.id),
        questionCount: questions.length,
        questionId: "DA40-ELEC-9001",
        topic: "Electrical",
        selectedOptionId: "a",
        isCorrect: true,
        timeLimitSeconds: null,
      });

      const result = gradeTest("DA40", questions, [
        { questionId: "DA40-ELEC-9001", selectedOptionId: "a" },
        { questionId: "DA40-ELEC-9002", selectedOptionId: null },
        { questionId: "DA40-FUEL-9001", selectedOptionId: "a" },
      ]);
      const outcome = await recordTestResult(userId, clientTestId, result);
      expect(outcome.status).toBe("recorded");

      const [session] = await sessionsFor(clientTestId);
      expect(session.completedAt).toBeInstanceOf(Date);

      const rows = await attemptsFor(outcome.testSessionId);
      expect(rows).toHaveLength(3);
      expect(rows.map((r) => [r.questionId, r.selectedOptionId])).toEqual([
        ["DA40-ELEC-9001", "a"],
        ["DA40-ELEC-9002", null],
        ["DA40-FUEL-9001", "a"],
      ]);
    });

    it("keeps a row's answeredAt when Finish repeats the same answer", async () => {
      const clientTestId = randomUUID();
      await saveAnswer({
        userId,
        clientTestId,
        aircraftCode: "DA40",
        questionIds: [questions[0].id],
        questionCount: 1,
        questionId: "DA40-ELEC-9001",
        topic: "Electrical",
        selectedOptionId: "a",
        isCorrect: true,
        timeLimitSeconds: null,
      });
      const [beforeSession] = await sessionsFor(clientTestId);
      const [before] = await attemptsFor(beforeSession.id);

      // A small gap, so a wrongly-bumped timestamp would be measurably later.
      await new Promise((resolve) => setTimeout(resolve, 20));

      const result = gradeTest("DA40", [questions[0]], [
        { questionId: "DA40-ELEC-9001", selectedOptionId: "a" },
      ]);
      await recordTestResult(userId, clientTestId, result);

      const [after] = await attemptsFor(beforeSession.id);
      expect(after.answeredAt.getTime()).toBe(before.answeredAt.getTime());
    });

    it("moves a row's answeredAt when Finish's answer differs from the last saved one", async () => {
      const clientTestId = randomUUID();
      await saveAnswer({
        userId,
        clientTestId,
        aircraftCode: "DA40",
        questionIds: [questions[0].id],
        questionCount: 1,
        questionId: "DA40-ELEC-9001",
        topic: "Electrical",
        selectedOptionId: "a",
        isCorrect: true,
        timeLimitSeconds: null,
      });
      const [beforeSession] = await sessionsFor(clientTestId);
      const [before] = await attemptsFor(beforeSession.id);

      await new Promise((resolve) => setTimeout(resolve, 20));

      // The student went back and changed their mind after the last save.
      const result = gradeTest("DA40", [questions[0]], [
        { questionId: "DA40-ELEC-9001", selectedOptionId: "b" },
      ]);
      await recordTestResult(userId, clientTestId, result);

      const [after] = await attemptsFor(beforeSession.id);
      expect(after.selectedOptionId).toBe("b");
      expect(after.answeredAt.getTime()).toBeGreaterThan(before.answeredAt.getTime());
    });
  });

  describe("the stored clock", () => {
    it("stamps startedAt once, when the timed session is created", async () => {
      const clientTestId = randomUUID();
      const outcome = await saveAnswer({
        userId,
        clientTestId,
        aircraftCode: "DA40",
        questionIds: questions.map((q) => q.id),
        questionCount: questions.length,
        questionId: "DA40-ELEC-9001",
        topic: "Electrical",
        selectedOptionId: "a",
        isCorrect: true,
        timeLimitSeconds: 600,
      });

      expect(outcome.status).toBe("recorded");
      const [session] = await sessionsFor(clientTestId);
      expect(session.startedAt).toBeInstanceOf(Date);
      expect(session.timeLimitSeconds).toBe(600);
    });

    it("does not move the clock on a later answer — this is the whole point", async () => {
      // A reload that answered again must not buy the student more time. The
      // clock belongs to the session, and the session is created once.
      const clientTestId = randomUUID();
      const base = {
        userId,
        clientTestId,
        aircraftCode: "DA40",
        questionIds: questions.map((q) => q.id),
        questionCount: questions.length,
        topic: "Electrical",
        selectedOptionId: "a",
        isCorrect: true,
      };

      await saveAnswer({ ...base, questionId: "DA40-ELEC-9001", timeLimitSeconds: 600 });
      const [before] = await sessionsFor(clientTestId);

      await new Promise((resolve) => setTimeout(resolve, 30));

      // A second answer, even one claiming a much more generous limit.
      const later = await saveAnswer({
        ...base,
        questionId: "DA40-ELEC-9002",
        timeLimitSeconds: 99999,
      });

      const [after] = await sessionsFor(clientTestId);
      expect(after.startedAt?.getTime()).toBe(before.startedAt?.getTime());
      expect(after.timeLimitSeconds).toBe(600);
      // And the outcome reports the stored clock, not the one just claimed.
      expect(later.status === "recorded" && later.timeLimitSeconds).toBe(600);
    });

    it("still stamps a start on an untimed test, but no limit", async () => {
      // Study mode has no deadline, yet the screen shows how long the
      // student has been at it — and that has to survive a refresh rather
      // than restart at zero. So every session records when it began; only
      // the limit is optional, and only exam mode has one.
      const clientTestId = randomUUID();
      const before = new Date();
      await saveAnswer({
        userId,
        clientTestId,
        aircraftCode: "DA40",
        questionIds: [questions[0].id],
        questionCount: 1,
        questionId: "DA40-ELEC-9001",
        topic: "Electrical",
        selectedOptionId: "a",
        isCorrect: true,
        timeLimitSeconds: null,
      });

      const [session] = await sessionsFor(clientTestId);
      expect(session.startedAt).not.toBeNull();
      expect(session.startedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(session.timeLimitSeconds).toBeNull();
    });

    it("does not move an untimed test's start either", async () => {
      // The same fixed-instant property the countdown relies on, for the
      // count-up: a second answer must not restart the stopwatch.
      const clientTestId = randomUUID();
      const base = {
        userId,
        clientTestId,
        aircraftCode: "DA40",
        questionIds: questions.map((q) => q.id),
        questionCount: questions.length,
        topic: "Electrical",
        selectedOptionId: "a",
        isCorrect: true,
        timeLimitSeconds: null,
      };

      await saveAnswer({ ...base, questionId: "DA40-ELEC-9001" });
      const [before] = await sessionsFor(clientTestId);

      await new Promise((resolve) => setTimeout(resolve, 30));
      await saveAnswer({ ...base, questionId: "DA40-ELEC-9002" });

      const [after] = await sessionsFor(clientTestId);
      expect(after.startedAt?.getTime()).toBe(before.startedAt?.getTime());
      expect(after.timeLimitSeconds).toBeNull();
    });

    it("hands the clock back to a resume", async () => {
      const clientTestId = randomUUID();
      await saveAnswer({
        userId,
        clientTestId,
        aircraftCode: "DA40",
        questionIds: [questions[0].id],
        questionCount: 1,
        questionId: "DA40-ELEC-9001",
        topic: "Electrical",
        selectedOptionId: "a",
        isCorrect: true,
        timeLimitSeconds: 1200,
      });

      const lookup = await findSession(userId, "DA40", clientTestId);
      expect(lookup.kind).toBe("resumable");
      if (lookup.kind === "resumable") {
        expect(lookup.startedAt).toBeInstanceOf(Date);
        expect(lookup.timeLimitSeconds).toBe(1200);
      }
    });
  });

  describe("findSession", () => {
    it("reports 'none' for an id nothing has used", async () => {
      const lookup = await findSession(userId, "DA40", randomUUID());
      expect(lookup.kind).toBe("none");
    });

    it("reports 'resumable' for a test still in progress on this aircraft", async () => {
      const clientTestId = randomUUID();
      await saveAnswer({
        userId,
        clientTestId,
        aircraftCode: "DA40",
        questionIds: ["DA40-ELEC-9001", "DA40-ELEC-9002"],
        questionCount: 2,
        questionId: "DA40-ELEC-9001",
        topic: "Electrical",
        selectedOptionId: "a",
        isCorrect: true,
        timeLimitSeconds: null,
      });

      const lookup = await findSession(userId, "DA40", clientTestId);
      expect(lookup).toMatchObject({
        kind: "resumable",
        questionIds: ["DA40-ELEC-9001", "DA40-ELEC-9002"],
      });
    });

    it("reports 'taken' for a finished test rather than resuming it", async () => {
      const clientTestId = randomUUID();
      const result = gradeTest("DA40", [questions[0]], [
        { questionId: "DA40-ELEC-9001", selectedOptionId: "a" },
      ]);
      await recordTestResult(userId, clientTestId, result);

      const lookup = await findSession(userId, "DA40", clientTestId);
      expect(lookup.kind).toBe("taken");
    });

    it("reports 'taken' for an id already used by a different aircraft", async () => {
      const clientTestId = randomUUID();
      await saveAnswer({
        userId,
        clientTestId,
        aircraftCode: "DA40",
        questionIds: ["DA40-ELEC-9001"],
        questionCount: 1,
        questionId: "DA40-ELEC-9001",
        topic: "Electrical",
        selectedOptionId: "a",
        isCorrect: true,
        timeLimitSeconds: null,
      });

      const lookup = await findSession(userId, "A320", clientTestId);
      expect(lookup.kind).toBe("taken");
    });

    it("never resumes another user's session", async () => {
      const [other] = await db
        .insert(users)
        .values({ email: `attempts-other-${randomUUID()}@example.invalid`, passwordHash: "x" })
        .returning({ id: users.id });

      const clientTestId = randomUUID();
      await saveAnswer({
        userId,
        clientTestId,
        aircraftCode: "DA40",
        questionIds: ["DA40-ELEC-9001"],
        questionCount: 1,
        questionId: "DA40-ELEC-9001",
        topic: "Electrical",
        selectedOptionId: "a",
        isCorrect: true,
        timeLimitSeconds: null,
      });

      const lookup = await findSession(other.id, "DA40", clientTestId);
      expect(lookup.kind).toBe("none");

      await db.delete(users).where(eq(users.id, other.id));
    });
  });

  describe("getSessionAnswers", () => {
    it("returns exactly what has been saved for that session, and no other", async () => {
      const clientTestId = randomUUID();
      await saveAnswer({
        userId,
        clientTestId,
        aircraftCode: "DA40",
        questionIds: ["DA40-ELEC-9001", "DA40-ELEC-9002"],
        questionCount: 2,
        questionId: "DA40-ELEC-9001",
        topic: "Electrical",
        selectedOptionId: "a",
        isCorrect: true,
        timeLimitSeconds: null,
      });
      await saveAnswer({
        userId,
        clientTestId,
        aircraftCode: "DA40",
        questionIds: ["DA40-ELEC-9001", "DA40-ELEC-9002"],
        questionCount: 2,
        questionId: "DA40-ELEC-9002",
        topic: "Electrical",
        selectedOptionId: "b",
        isCorrect: false,
        timeLimitSeconds: null,
      });

      const [session] = await sessionsFor(clientTestId);
      const answers = await getSessionAnswers(session.id);

      expect(answers).toEqual({ "DA40-ELEC-9001": "a", "DA40-ELEC-9002": "b" });

      // A second, unrelated session must not leak into this one's answers.
      const otherClientTestId = randomUUID();
      await saveAnswer({
        userId,
        clientTestId: otherClientTestId,
        aircraftCode: "DA40",
        questionIds: ["DA40-FUEL-9001"],
        questionCount: 1,
        questionId: "DA40-FUEL-9001",
        topic: "Fuel",
        selectedOptionId: "a",
        isCorrect: true,
        timeLimitSeconds: null,
      });

      expect(await getSessionAnswers(session.id)).toEqual({
        "DA40-ELEC-9001": "a",
        "DA40-ELEC-9002": "b",
      });
    });
  });
});
