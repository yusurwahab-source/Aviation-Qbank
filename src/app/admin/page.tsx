import type { Metadata } from "next";

import { Badge, EmptyState, PageHeading } from "@/components/ui";
import { listEarlyAccessSignups } from "@/db/early-access";
import { listQuestionReports } from "@/db/question-reports";
import { requireAdmin } from "@/lib/auth/require-admin";
import { PRICING_TIERS } from "@/config/plans";

import { resolveReport } from "./actions";
import { DataTable, formatDay } from "./admin-ui";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const TIER_NAMES = Object.fromEntries(PRICING_TIERS.map((tier) => [tier.id, tier.name]));

/**
 * Everything checkout not being live yet still needs a reader for: who
 * asked to be notified at `/pricing`, and every "report a problem with
 * this question" a student has sent from a test. Two lists, one page —
 * this area does not yet need `/owner`'s multi-page nav, and growing one
 * later is a smaller change than un-growing a nav built too early.
 */
export default async function AdminPage() {
  await requireAdmin();

  const [signups, reports] = await Promise.all([
    listEarlyAccessSignups(),
    listQuestionReports(),
  ]);

  const openReports = reports.filter((report) => report.status === "open");
  const resolvedReports = reports.filter((report) => report.status === "resolved");

  return (
    <>
      <PageHeading title="Admin" subtitle="Early access interest, and questions students have flagged as wrong." />

      <section>
        <h2 className="text-lg font-semibold text-foreground">Early access signups</h2>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          From the buy buttons on <code className="font-mono">/pricing</code> — checkout is not
          live yet, so these are the people to reach out to first.
        </p>
        {signups.length === 0 ? (
          <EmptyState title="No signups yet">
            Nobody has joined the early access list from <code className="font-mono">/pricing</code>{" "}
            yet.
          </EmptyState>
        ) : (
          <DataTable
            headers={["Email", "Aircraft", "Plan", "Joined"]}
            empty="No signups yet."
            rows={signups.map((signup) => [
              signup.email,
              signup.aircraft,
              TIER_NAMES[signup.tier] ?? signup.tier,
              formatDay(signup.createdAt),
            ])}
          />
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">Question reports</h2>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          &ldquo;Report a problem with this question&rdquo; — {openReports.length} open,{" "}
          {resolvedReports.length} resolved.
        </p>
        {openReports.length === 0 ? (
          <EmptyState title="No open reports">Nothing flagged as wrong right now.</EmptyState>
        ) : (
          <DataTable
            headers={["Question", "Aircraft", "Reported by", "Message", "Reported", ""]}
            empty="No open reports."
            rows={openReports.map((report) => [
              <code key="id" className="font-mono text-xs">
                {report.questionId}
              </code>,
              report.aircraftCode,
              report.reporterEmail ?? <span className="text-muted-foreground">Signed out</span>,
              <span key="msg" className="block max-w-sm whitespace-pre-wrap">
                {report.message}
              </span>,
              formatDay(report.createdAt),
              <form key="resolve" action={resolveReport}>
                <input type="hidden" name="id" value={report.id} />
                <button
                  type="submit"
                  className="tap-target rounded-lg border border-border px-3 text-xs font-semibold text-foreground transition hover:border-brand hover:text-brand"
                >
                  Mark resolved
                </button>
              </form>,
            ])}
          />
        )}

        {resolvedReports.length > 0 ? (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              {resolvedReports.length} resolved {resolvedReports.length === 1 ? "report" : "reports"}
            </summary>
            <div className="mt-3">
              <DataTable
                headers={["Question", "Aircraft", "Reported by", "Message", "Reported"]}
                empty="None."
                rows={resolvedReports.map((report) => [
                  <code key="id" className="font-mono text-xs">
                    {report.questionId}
                  </code>,
                  report.aircraftCode,
                  report.reporterEmail ?? <span className="text-muted-foreground">Signed out</span>,
                  <span key="msg" className="block max-w-sm whitespace-pre-wrap">
                    {report.message}
                  </span>,
                  <span key="date" className="flex items-center gap-2">
                    {formatDay(report.createdAt)}
                    <Badge tone="correct">Resolved</Badge>
                  </span>,
                ])}
              />
            </div>
          </details>
        ) : null}
      </section>
    </>
  );
}
