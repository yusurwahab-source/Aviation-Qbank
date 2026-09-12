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
    ({ recordTestResult } = await import("@/db/attempts"));

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
});
