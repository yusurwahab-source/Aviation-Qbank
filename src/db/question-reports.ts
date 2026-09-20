import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { questionReports, questions, users } from "@/db/schema";
import type { QuestionOption } from "@/content/schema";

export type ReportReason = "wrong_answer" | "unclear" | "typo" | "outdated" | "other";
export type ReportStatus = "open" | "resolved" | "dismissed";

/**
 * "Report a problem" on a question, from the test-taking UI.
 *
 * `userId` null for a signed-out reporter — practising without an account
 * still means reading a question that might be wrong, and there is nothing
 * here to gate on being signed in the way flags and notes are.
 */
export async function createQuestionReport(input: {
  questionId: string;
  userId: string | null;
  reason: ReportReason;
  comment: string | null;
}): Promise<void> {
  await getDb().insert(questionReports).values({
    questionId: input.questionId,
    userId: input.userId,
    reason: input.reason,
    comment: input.comment,
  });
}

export type QuestionReportListing = {
  id: string;
  questionId: string;
  reporterEmail: string | null;
  reason: ReportReason;
  comment: string | null;
  status: ReportStatus;
  createdAt: Date;
  /** Null when the question has since been edited away (a changed id) or
   * removed from content entirely — the same "still counts, just cannot
   * show current wording" shape `reports.ts` gives a deleted question's
   * attempts. */
  question: {
    question: string;
    options: QuestionOption[];
    correct: string;
    explanation: string;
    aircraftCode: string;
    topic: string;
  } | null;
};

/**
 * The inbox's list, newest first, optionally filtered by status.
 *
 * Left-joined to `questions` — read-only, purely for display alongside the
 * report — rather than an inner join, so a report on a question that has
 * since been edited or removed from content still appears; only its current
 * wording is unavailable, not the report itself.
 */
export async function listQuestionReports(
  filter: { status?: ReportStatus | null } = {},
  limit = 200,
): Promise<QuestionReportListing[]> {
  const conditions = filter.status ? [eq(questionReports.status, filter.status)] : [];

  const rows = await getDb()
    .select({
      id: questionReports.id,
      questionId: questionReports.questionId,
      reporterEmail: users.email,
      reason: questionReports.reason,
      comment: questionReports.comment,
      status: questionReports.status,
      createdAt: questionReports.createdAt,
      qQuestion: questions.question,
      qOptions: questions.options,
      qCorrect: questions.correct,
      qExplanation: questions.explanation,
      qAircraftCode: questions.aircraftCode,
      qTopic: questions.topic,
    })
    .from(questionReports)
    .leftJoin(users, eq(users.id, questionReports.userId))
    .leftJoin(questions, eq(questions.id, questionReports.questionId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(questionReports.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    questionId: row.questionId,
    reporterEmail: row.reporterEmail,
    reason: row.reason,
    comment: row.comment,
    status: row.status,
    createdAt: row.createdAt,
    question:
      row.qQuestion !== null
        ? {
            question: row.qQuestion,
            options: row.qOptions ?? [],
            correct: row.qCorrect ?? "",
            explanation: row.qExplanation ?? "",
            aircraftCode: row.qAircraftCode ?? "",
            topic: row.qTopic ?? "",
          }
        : null,
  }));
}

/** How many reports are open right now — the owner overview's own number. */
export async function countOpenQuestionReports(): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(questionReports)
    .where(eq(questionReports.status, "open"));
  return row?.n ?? 0;
}

/** Moves one report to resolved or dismissed. Returns null for a stale id. */
export async function updateQuestionReportStatus(
  id: string,
  status: ReportStatus,
): Promise<{ questionId: string } | null> {
  const [row] = await getDb()
    .update(questionReports)
    .set({ status })
    .where(eq(questionReports.id, id))
    .returning({ questionId: questionReports.questionId });
  return row ?? null;
}
