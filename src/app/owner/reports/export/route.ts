import "server-only";

import { listQuestionReports } from "@/db/question-reports";
import { requireOwner } from "@/lib/auth/require-owner";

/**
 * Every "report a problem" submission as a CSV download, question id
 * included — the id is what lets a report be matched back to the content
 * file that needs fixing without reopening the app.
 *
 * `requireOwner()` here for the same reason `gift-codes/export` has it: a
 * route handler is its own reachable entry point, not covered by the page
 * around it having already checked.
 */
export async function GET(): Promise<Response> {
  await requireOwner();

  const reports = await listQuestionReports({}, 10000);

  const headers = [
    "question_id",
    "reason",
    "status",
    "reporter_email",
    "comment",
    "aircraft_code",
    "topic",
    "created_at",
  ];

  const rows = reports.map((report) =>
    [
      report.questionId,
      report.reason,
      report.status,
      report.reporterEmail ?? "",
      report.comment ?? "",
      report.question?.aircraftCode ?? "",
      report.question?.topic ?? "",
      report.createdAt.toISOString(),
    ]
      .map(csvField)
      .join(","),
  );

  const csv = [headers.join(","), ...rows].join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="question-reports-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

/** Quotes a field only when it needs it, and escapes an embedded quote by
 * doubling it — the one rule CSV actually has. */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
