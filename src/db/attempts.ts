import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { attempts, testSessions } from "@/db/schema";
import type { AttemptInsert } from "@/db/schema";
import type { TestResult } from "@/lib/grading";

/**
 * Writing the attempt log.
 *
 * Reading it is Phase 4's job; this file only records. Every answer a
 * signed-in user submits lands here, which is what the reports will be built
 * from.
 */

export type RecordOutcome =
  | { status: "recorded"; testSessionId: string }
  /** The same test was already recorded — a double-click or a retried request. */
  | { status: "duplicate"; testSessionId: string };

/**
 * Records one finished test: the session row and one attempt per question.
 *
 * All of it happens in a single transaction, so a half-written test can never
 * exist. A report that counted nine answers from a ten-question test would be
 * quietly wrong, which is worse than not recording it at all.
 */
export async function recordTestResult(
  userId: string,
  clientTestId: string,
  result: TestResult,
): Promise<RecordOutcome> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [session] = await tx
      .insert(testSessions)
      .values({
        userId,
        aircraftCode: result.aircraftCode,
        clientTestId,
        questionCount: result.total,
      })
      // The unique index on (user_id, client_test_id) turns a repeated
      // submission into a no-op instead of a duplicate test.
      .onConflictDoNothing({ target: [testSessions.userId, testSessions.clientTestId] })
      .returning({ id: testSessions.id });

    if (!session) {
      // Already recorded. Return the original session rather than writing again.
      const [existing] = await tx
        .select({ id: testSessions.id })
        .from(testSessions)
        .where(
          and(
            eq(testSessions.userId, userId),
            eq(testSessions.clientTestId, clientTestId),
          ),
        )
        .limit(1);

      return { status: "duplicate", testSessionId: existing?.id ?? "" } as const;
    }

    const rows: AttemptInsert[] = result.graded.map((entry) => ({
      userId,
      testSessionId: session.id,
      questionId: entry.question.id,
      aircraftCode: result.aircraftCode,
      // Snapshot: the topic as it was when the question was answered.
      topic: entry.question.topic,
      selectedOptionId: entry.selectedOptionId,
      isCorrect: entry.isCorrect,
    }));

    if (rows.length > 0) {
      await tx.insert(attempts).values(rows);
    }

    return { status: "recorded", testSessionId: session.id } as const;
  });
}
