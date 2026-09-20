import "server-only";

import { and, count, eq, inArray, lt } from "drizzle-orm";

import { getDb } from "@/db";
import { previewAttempts } from "@/db/schema";

/**
 * The signed-out preview allowance, counted.
 *
 * The mirror of `subscriptions.ts`'s `countQuestionsAnswered` and
 * `hasAnsweredQuestionBefore`, against a cookie-borne visitor id instead of
 * a user id. Same two questions, same two answers, same per-aircraft
 * scoping — only the identity differs. See `previewAttempts` in
 * `db/schema.ts` for what that identity is worth, and
 * `lib/auth/preview-visitor.ts` for where it comes from.
 */

/** How many distinct questions this visitor has spent on this aircraft. */
export async function countPreviewQuestionsAnswered(
  visitorId: string,
  aircraftCode: string,
): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(previewAttempts)
    .where(
      and(
        eq(previewAttempts.visitorId, visitorId),
        eq(previewAttempts.aircraftCode, aircraftCode.toUpperCase()),
      ),
    );

  return Number(row?.total ?? 0);
}

/**
 * Whether this visitor has already been shown this question's answer.
 *
 * Not scoped to an aircraft, deliberately: a question id carries its own
 * aircraft, and the point of the check is "have you already paid for this
 * one", which cannot depend on which test it is being asked from.
 */
export async function hasPreviewedQuestion(
  visitorId: string,
  questionId: string,
): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: previewAttempts.id })
    .from(previewAttempts)
    .where(
      and(eq(previewAttempts.visitorId, visitorId), eq(previewAttempts.questionId, questionId)),
    )
    .limit(1);

  return row !== undefined;
}

/**
 * Records that this visitor has been shown this question's answer.
 *
 * `onConflictDoNothing` rather than an upsert: the unique index is what
 * makes a repeat answer free, and two tabs answering the same question at
 * once should settle to one row rather than to an error. Written *before*
 * the answer goes back, the same ordering a signed-in attempt uses — asking
 * to see an answer costs you the attempt either way.
 */
export async function recordPreviewAnswer(
  visitorId: string,
  questionId: string,
  aircraftCode: string,
): Promise<void> {
  await getDb()
    .insert(previewAttempts)
    .values({ visitorId, questionId, aircraftCode: aircraftCode.toUpperCase() })
    .onConflictDoNothing();
}

/**
 * Which of these questions this visitor has already spent a preview slot on.
 *
 * The set form of `hasPreviewedQuestion`, and the exact counterpart of
 * `answeredQuestionIdsAmong` for a signed-out caller — `submitTest` asks
 * both the same question about whoever is calling it, and neither can
 * afford a query per question on a test that may be the whole bank.
 */
export async function previewedQuestionIdsAmong(
  visitorId: string,
  questionIds: string[],
): Promise<Set<string>> {
  if (questionIds.length === 0) return new Set();

  const rows = await getDb()
    .selectDistinct({ questionId: previewAttempts.questionId })
    .from(previewAttempts)
    .where(
      and(
        eq(previewAttempts.visitorId, visitorId),
        inArray(previewAttempts.questionId, questionIds),
      ),
    );

  return new Set(rows.map((row) => row.questionId));
}

/**
 * Records several preview answers at once, ignoring any already recorded.
 *
 * What Finish uses: a signed-out visitor who left questions blank spends
 * what remains of their preview on seeing those answers, in one write rather
 * than one per question. `onConflictDoNothing` means a question already
 * spent stays one row, the same as the single-row version above.
 */
export async function recordPreviewAnswers(
  visitorId: string,
  aircraftCode: string,
  questionIds: string[],
): Promise<void> {
  if (questionIds.length === 0) return;

  await getDb()
    .insert(previewAttempts)
    .values(
      questionIds.map((questionId) => ({
        visitorId,
        questionId,
        aircraftCode: aircraftCode.toUpperCase(),
      })),
    )
    .onConflictDoNothing();
}

/**
 * Deletes preview rows older than the cookie that points at them could
 * possibly be.
 *
 * Housekeeping only, and in the same unfinished state as the other sweeps in
 * this codebase: correct, and called by nothing yet. A stale row is never
 * wrong — the visitor it belonged to cannot present that cookie any more —
 * it only takes up space. See "Nothing sweeps the housekeeping tables" in
 * CLAUDE.md.
 */
export async function sweepPreviewAttempts(olderThanDays = 180): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const deleted = await getDb()
    .delete(previewAttempts)
    .where(lt(previewAttempts.answeredAt, cutoff))
    .returning({ id: previewAttempts.id });

  return deleted.length;
}
