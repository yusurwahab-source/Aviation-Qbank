import Link from "next/link";
import type { Metadata } from "next";

import { Badge, Card, EmptyState, PageHeading } from "@/components/ui";
import { listQuestionReports, type ReportStatus } from "@/db/question-reports";
import { requireOwner } from "@/lib/auth/require-owner";

import { OwnerNav, formatDay } from "../owner-ui";
import { ReportActions } from "./report-actions";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const STATUS_FILTERS: { value: ReportStatus | "all"; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

const REASON_LABEL: Record<string, string> = {
  wrong_answer: "Wrong answer",
  unclear: "Unclear",
  typo: "Typo",
  outdated: "Outdated",
  other: "Other",
};

function firstOf(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * What students have flagged as wrong with a question, alongside the
 * question's current text — read-only. There is no edit action here:
 * fixing a question is still the content-file-and-deploy workflow this
 * phase does not touch. This inbox only decides what to do with the
 * *report* (resolved, dismissed, or left open).
 */
export default async function OwnerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  await requireOwner();

  const query = await searchParams;
  const rawStatus = firstOf(query.status);
  const statusFilter: ReportStatus | "all" = STATUS_FILTERS.some((f) => f.value === rawStatus)
    ? (rawStatus as ReportStatus | "all")
    : "open";

  const reports = await listQuestionReports({
    status: statusFilter === "all" ? null : statusFilter,
  });

  return (
    <>
      <PageHeading
        title="Reports"
        subtitle="Problems students have flagged with a question — read-only against the question itself."
      />
      <OwnerNav current="/owner/reports" />

      <Card className="mb-6">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => {
            const active = filter.value === statusFilter;
            const href = filter.value === "open" ? "/owner/reports" : `/owner/reports?status=${filter.value}`;
            return (
              <Link
                key={filter.value}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-brand text-on-solid"
                    : "border border-border text-muted-foreground hover:border-brand hover:text-brand"
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>
      </Card>

      {reports.length === 0 ? (
        <EmptyState title="Nothing here">
          {statusFilter === "open"
            ? "No open reports right now."
            : `No ${statusFilter === "all" ? "" : statusFilter} reports.`}
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {reports.map((report) => (
            <li key={report.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="warning">{REASON_LABEL[report.reason] ?? report.reason}</Badge>
                      <Badge
                        tone={
                          report.status === "open"
                            ? "flag"
                            : report.status === "resolved"
                              ? "correct"
                              : "neutral"
                        }
                      >
                        {report.status}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {report.reporterEmail ?? "signed-out visitor"} · {formatDay(report.createdAt)} ·{" "}
                      <span className="font-mono">{report.questionId}</span>
                    </p>
                  </div>
                  {report.status === "open" ? <ReportActions reportId={report.id} /> : null}
                </div>

                {report.comment ? (
                  <p className="mt-3 rounded-lg bg-surface-muted p-3 text-sm text-foreground">
                    {report.comment}
                  </p>
                ) : null}

                <div className="mt-4 border-t border-border pt-4">
                  {report.question ? (
                    <>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {report.question.aircraftCode} · {report.question.topic}
                      </p>
                      <p className="question-text font-medium text-foreground">
                        {report.question.question}
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {report.question.options.map((option) => (
                          <li
                            key={option.id}
                            className={`question-text rounded-lg border px-3 py-2 text-sm ${
                              option.id === report.question!.correct
                                ? "border-correct bg-correct-soft text-foreground"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {option.text}
                            {option.id === report.question!.correct ? (
                              <span className="ml-2 text-xs font-semibold text-correct">Correct</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      <p className="question-text mt-2 text-sm text-muted-foreground">
                        {report.question.explanation}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      This question no longer exists in the content — it may have been edited or
                      removed since this report was made.
                    </p>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
