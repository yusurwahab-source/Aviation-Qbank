import "server-only";

import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { questionReports, users } from "@/db/schema";

/**
 * "Report a problem with this question" — every question carries the link.
 * `userId` is nullable (see `schema.ts`): a signed-out visitor may report a
 * bad question too, so `recordQuestionReport` takes `userId` as optional.
 */

export async function recordQuestionReport(input: {
  questionId: string;
  aircraftCode: string;
  userId: string | null;
  message: string;
}): Promise<void> {
  await getDb().insert(questionReports).values({
    questionId: input.questionId,
    aircraftCode: input.aircraftCode,
    userId: input.userId,
    message: input.message,
  });
}

export type QuestionReportListing = {
  id: string;
  questionId: string;
  aircraftCode: string;
  reporterEmail: string | null;
  message: string;
  status: "open" | "resolved";
  createdAt: Date;
};

/** Left-joined to `users` so a signed-out visitor's report still appears —
 * with no email to show, exactly as the account it came from. */
export async function listQuestionReports(limit = 200): Promise<QuestionReportListing[]> {
  return getDb()
    .select({
      id: questionReports.id,
      questionId: questionReports.questionId,
      aircraftCode: questionReports.aircraftCode,
      reporterEmail: users.email,
      message: questionReports.message,
      status: questionReports.status,
      createdAt: questionReports.createdAt,
    })
    .from(questionReports)
    .leftJoin(users, eq(users.id, questionReports.userId))
    .orderBy(desc(questionReports.createdAt))
    .limit(limit);
}

/** Marks a report resolved — the one write `/admin` performs on this table,
 * mirroring how small the owner area's other writes already are. */
export async function resolveQuestionReport(id: string): Promise<void> {
  await getDb().update(questionReports).set({ status: "resolved" }).where(eq(questionReports.id, id));
}
