import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { attempts, testSessions } from "@/db/schema";
import type { AttemptInsert } from "@/db/schema";
import type { TestResult } from "@/lib/grading";

/**
 * Writing the attempt log.
 *
 * Reading it is Phase 4's job; this file only records. Two things write here:
 * `saveAnswer`, called after every question a signed-in user answers, and
 * `recordTestResult`, called once at Finish. Both are upserts keyed on
 * `(testSessionId, questionId)`, so going back and changing an answer before
 * Finish replaces the same row rather than adding a second one, and Finish's
 * sweep over every question is safe to run even for rows `saveAnswer` already
 * wrote.
 */

/** How one answer's save attempt went. */
export type SaveAnswerOutcome =
  | { status: "recorded"; testSessionId: string }
  /** The test this answer belongs to was already finished. Nothing written. */
  | { status: "closed" }
  /** The clientTestId belongs to a different aircraft. Nothing written. */
  | { status: "wrong-aircraft" };

/**
 * Records one answer, creating the test session on the first call.
 *
 * `questionIds` is the full, ordered set of questions in this test — needed
 * only to create the session, so a later refresh can resume by id instead of
 * drawing a new random set. Later calls for the same `clientTestId` ignore it.
 *
 * Refuses to write once the session is finished: a stray call from a stale
 * tab after Finish has already run on another tab must not reopen a test that
 * is already part of the student's recorded history.
 */
export async function saveAnswer(input: {
  userId: string;
  clientTestId: string;
  aircraftCode: string;
  questionIds: string[];
  questionCount: number;
  questionId: string;
  topic: string;
  selectedOptionId: string;
  isCorrect: boolean;
}): Promise<SaveAnswerOutcome> {
  const db = getDb();
  const aircraftCode = input.aircraftCode.toUpperCase();

  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(testSessions)
      .values({
        userId: input.userId,
        aircraftCode,
        clientTestId: input.clientTestId,
        questionCount: input.questionCount,
        questionIds: input.questionIds,
        // Explicit: this session is still being taken.
        completedAt: null,
      })
      .onConflictDoNothing({ target: [testSessions.userId, testSessions.clientTestId] })
      .returning({ id: testSessions.id, aircraftCode: testSessions.aircraftCode, completedAt: testSessions.completedAt });

    const session =
      inserted ??
      (
        await tx
          .select({
            id: testSessions.id,
            aircraftCode: testSessions.aircraftCode,
            completedAt: testSessions.completedAt,
          })
          .from(testSessions)
          .where(
            and(
              eq(testSessions.userId, input.userId),
              eq(testSessions.clientTestId, input.clientTestId),
            ),
          )
          .limit(1)
      )[0];

    if (!session) throw new Error("Test session vanished mid-transaction.");
    if (session.aircraftCode !== aircraftCode) return { status: "wrong-aircraft" } as const;
    if (session.completedAt) return { status: "closed" } as const;

    await tx
      .insert(attempts)
      .values({
        userId: input.userId,
        testSessionId: session.id,
        questionId: input.questionId,
        aircraftCode,
        topic: input.topic,
        selectedOptionId: input.selectedOptionId,
        isCorrect: input.isCorrect,
      })
      .onConflictDoUpdate({
        target: [attempts.testSessionId, attempts.questionId],
        set: {
          selectedOptionId: sql`excluded.selected_option_id`,
          isCorrect: sql`excluded.is_correct`,
          answeredAt: sql`excluded.answered_at`,
        },
      });

    return { status: "recorded", testSessionId: session.id } as const;
  });
}

export type RecordOutcome =
  | { status: "recorded"; testSessionId: string }
  /** The same test was already recorded — a double-click or a retried request. */
  | { status: "duplicate"; testSessionId: string };

/**
 * Finishes a test: marks its session complete and makes sure every question
 * has a row, including ones left unanswered.
 *
 * Idempotent, and safe to call whether or not `saveAnswer` ever ran for this
 * test — a student who clicks Finish without changing a single radio button
 * has no session yet, and this creates one. A student who answered every
 * question through `saveAnswer` already has one, and this only marks it done.
 *
 * A row's `answeredAt` only moves forward when the final answer actually
 * differs from what was last recorded for it. Otherwise Finish's sweep would
 * stamp every question with the moment the test ended rather than the moment
 * it was actually answered, which is what the retry list and "last answered"
 * dates are supposed to mean.
 */
export async function recordTestResult(
  userId: string,
  clientTestId: string,
  result: TestResult,
): Promise<RecordOutcome> {
  const db = getDb();
  const questionIds = result.graded.map((entry) => entry.question.id);

  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(testSessions)
      .values({
        userId,
        aircraftCode: result.aircraftCode,
        clientTestId,
        questionCount: result.total,
        questionIds,
        completedAt: sql`now()`,
      })
      // The unique index on (user_id, client_test_id) turns a repeated
      // submission into a no-op instead of a duplicate test.
      .onConflictDoNothing({ target: [testSessions.userId, testSessions.clientTestId] })
      .returning({ id: testSessions.id });

    let sessionId: string;

    if (inserted) {
      sessionId = inserted.id;
    } else {
      const [existing] = await tx
        .select({ id: testSessions.id, completedAt: testSessions.completedAt })
        .from(testSessions)
        .where(
          and(eq(testSessions.userId, userId), eq(testSessions.clientTestId, clientTestId)),
        )
        .limit(1);

      if (!existing) throw new Error("Test session vanished mid-transaction.");

      // Already finished — a double-click or a retried request, not a fresh one.
      if (existing.completedAt) {
        return { status: "duplicate", testSessionId: existing.id } as const;
      }

      sessionId = existing.id;
      await tx
        .update(testSessions)
        .set({ completedAt: sql`now()`, questionCount: result.total, questionIds })
        .where(eq(testSessions.id, sessionId));
    }

    const rows: AttemptInsert[] = result.graded.map((entry) => ({
      userId,
      testSessionId: sessionId,
      questionId: entry.question.id,
      aircraftCode: result.aircraftCode,
      // Snapshot: the topic as it was when the question was answered.
      topic: entry.question.topic,
      selectedOptionId: entry.selectedOptionId,
      isCorrect: entry.isCorrect,
    }));

    if (rows.length > 0) {
      await tx
        .insert(attempts)
        .values(rows)
        .onConflictDoUpdate({
          target: [attempts.testSessionId, attempts.questionId],
          set: {
            selectedOptionId: sql`excluded.selected_option_id`,
            isCorrect: sql`excluded.is_correct`,
            answeredAt: sql`case
              when attempts.selected_option_id is distinct from excluded.selected_option_id
              then excluded.answered_at
              else attempts.answered_at
            end`,
          },
        });
    }

    return { status: "recorded", testSessionId: sessionId } as const;
  });
}

export type SessionLookup =
  /** A test in progress under this id — safe to resume. */
  | { kind: "resumable"; id: string; questionIds: string[] }
  /**
   * This id already names a session, but not one this page can use: it is
   * already finished, or it belongs to a different aircraft. The unique index
   * on `(userId, clientTestId)` means this id can never be reused for a
   * second test — reusing it here would make every answer of the "new" test
   * silently fail to save, since it would collide with the old row. The test
   * page must mint a fresh id and redirect rather than proceed with this one.
   */
  | { kind: "taken" }
  /** No session exists under this id yet — free to start a fresh test on it. */
  | { kind: "none" };

/**
 * Looks up what a `clientTestId` currently names, for the test page to decide
 * whether to resume, redirect to a new id, or start fresh under this one.
 *
 * Scoped to the signed-in user: a `clientTestId` that belongs to someone else
 * is indistinguishable from one that does not exist at all, because the query
 * cannot return another user's row in the first place.
 */
export async function findSession(
  userId: string,
  aircraftCode: string,
  clientTestId: string,
): Promise<SessionLookup> {
  const [row] = await getDb()
    .select({
      id: testSessions.id,
      aircraftCode: testSessions.aircraftCode,
      questionIds: testSessions.questionIds,
      completedAt: testSessions.completedAt,
    })
    .from(testSessions)
    .where(and(eq(testSessions.userId, userId), eq(testSessions.clientTestId, clientTestId)))
    .limit(1);

  if (!row) return { kind: "none" };
  if (row.completedAt === null && row.aircraftCode === aircraftCode.toUpperCase()) {
    return { kind: "resumable", id: row.id, questionIds: row.questionIds };
  }
  return { kind: "taken" };
}

/** The answers already recorded for a session, for pre-filling a resumed test. */
export async function getSessionAnswers(
  testSessionId: string,
): Promise<Record<string, string | null>> {
  const rows = await getDb()
    .select({ questionId: attempts.questionId, selectedOptionId: attempts.selectedOptionId })
    .from(attempts)
    .where(eq(attempts.testSessionId, testSessionId));

  return Object.fromEntries(rows.map((row) => [row.questionId, row.selectedOptionId]));
}
