import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { questionFlags } from "@/db/schema";

/**
 * Marking a question to come back to.
 *
 * There is deliberately no "set" operation, only a toggle: the client always
 * knows whether a question is flagged (it has the full set for the test
 * already), so the only question the server ever answers is "make this the
 * opposite of what it is now" — which is also what makes the button safe to
 * fire optimistically without waiting to be told the current state first.
 */

/** Whether the flag ended up set or cleared, so the caller can reconcile an
 * optimistic UI update against what actually happened. */
export type ToggleFlagResult = { flagged: boolean };

export async function toggleQuestionFlag(
  userId: string,
  questionId: string,
  aircraftCode: string,
): Promise<ToggleFlagResult> {
  const db = getDb();

  const deleted = await db
    .delete(questionFlags)
    .where(and(eq(questionFlags.userId, userId), eq(questionFlags.questionId, questionId)))
    .returning({ id: questionFlags.id });

  if (deleted.length > 0) return { flagged: false };

  // Someone flagging the same question in two tabs at once could both reach
  // this insert; the unique index is what stops a duplicate row rather than
  // this code needing to notice the race itself.
  await db
    .insert(questionFlags)
    .values({ userId, questionId, aircraftCode: aircraftCode.toUpperCase() })
    .onConflictDoNothing({ target: [questionFlags.userId, questionFlags.questionId] });

  return { flagged: true };
}

/** Every flagged question id on one aircraft, for the "My flagged questions" preset. */
export async function getFlaggedQuestionIds(
  userId: string,
  aircraftCode: string,
): Promise<string[]> {
  const rows = await getDb()
    .select({ questionId: questionFlags.questionId })
    .from(questionFlags)
    .where(
      and(eq(questionFlags.userId, userId), eq(questionFlags.aircraftCode, aircraftCode.toUpperCase())),
    );

  return rows.map((row) => row.questionId);
}

/**
 * Which of a set of question ids are flagged, for painting the question map
 * and the option buttons in one query rather than one per question.
 */
export async function getFlaggedQuestionIdSet(
  userId: string,
  questionIds: string[],
): Promise<Set<string>> {
  if (questionIds.length === 0) return new Set();

  const rows = await getDb()
    .select({ questionId: questionFlags.questionId })
    .from(questionFlags)
    .where(and(eq(questionFlags.userId, userId), inArray(questionFlags.questionId, questionIds)));

  return new Set(rows.map((row) => row.questionId));
}
