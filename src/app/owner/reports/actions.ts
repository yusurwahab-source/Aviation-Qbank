"use server";

import { z } from "zod";

import { updateQuestionReportStatus } from "@/db/question-reports";
import { ownerAction } from "@/lib/owner/audited-action";

export type ReportActionState = { error?: string; message?: string };

const schema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(["resolved", "dismissed"]),
});

/**
 * Moves one report to resolved or dismissed. No edit action here —
 * fixing the question itself is out of scope this phase and happens
 * through the existing content-file-and-deploy workflow; this only ever
 * writes to `question_reports.status`.
 */
export const setReportStatus = ownerAction<ReportActionState, z.infer<typeof schema>>({
  action: (input) => (input.status === "resolved" ? "question_report.resolve" : "question_report.dismiss"),
  targetType: "question_report",

  parse(formData) {
    const parsed = schema.safeParse({
      reportId: formData.get("reportId"),
      status: formData.get("status"),
    });
    if (!parsed.success) return { ok: false, state: { error: "That report could not be updated." } };
    return { ok: true, input: parsed.data };
  },

  async run(input) {
    const updated = await updateQuestionReportStatus(input.reportId, input.status);
    if (!updated) return { ok: false, state: { error: "That report no longer exists." } };

    return {
      ok: true,
      targetId: input.reportId,
      metadata: { status: input.status, questionId: updated.questionId },
      state: { message: `Marked ${input.status}.` },
    };
  },

  revalidate: [{ path: "/owner/reports" }],
});
