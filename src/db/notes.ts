import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { questionNotes } from "@/db/schema";

/**
 * A student's own note on one question.
 *
 * There is exactly one per `(userId, questionId)`, which is what makes this
 * an upsert rather than something that needs its own "does one already
 * exist" check — the unique index in the schema is the actual guarantee,
 * this is just the query that relies on it.
 */

const MAX_NOTE_LENGTH = 4000;

/** An empty note is the same as no note — clearing the editor deletes the row
 * rather than leaving an empty one behind for the flagged/notes list to count. */
export async function saveQuestionNote(
  userId: string,
  questionId: string,
  aircraftCode: string,
  body: string,
): Promise<void> {
  const trimmed = body.trim().slice(0, MAX_NOTE_LENGTH);
  const db = getDb();

  if (trimmed === "") {
    await db
      .delete(questionNotes)
      .where(and(eq(questionNotes.userId, userId), eq(questionNotes.questionId, questionId)));
    return;
  }

  await db
    .insert(questionNotes)
    .values({ userId, questionId, aircraftCode: aircraftCode.toUpperCase(), body: trimmed })
    .onConflictDoUpdate({
      target: [questionNotes.userId, questionNotes.questionId],
      set: { body: sql`excluded.body`, updatedAt: sql`now()` },
    });
}

export async function getQuestionNote(
  userId: string,
  questionId: string,
): Promise<string | null> {
  const [row] = await getDb()
    .select({ body: questionNotes.body })
    .from(questionNotes)
    .where(and(eq(questionNotes.userId, userId), eq(questionNotes.questionId, questionId)))
    .limit(1);

  return row?.body ?? null;
}

/** Which of a set of questions have a note, for a marker on the question map —
 * bodies are fetched lazily per question, not in this bulk pass. */
export async function getQuestionIdsWithNotes(
  userId: string,
  questionIds: string[],
): Promise<Set<string>> {
  if (questionIds.length === 0) return new Set();

  const rows = await getDb()
    .select({ questionId: questionNotes.questionId })
    .from(questionNotes)
    .where(and(eq(questionNotes.userId, userId), inArray(questionNotes.questionId, questionIds)));

  return new Set(rows.map((row) => row.questionId));
}
