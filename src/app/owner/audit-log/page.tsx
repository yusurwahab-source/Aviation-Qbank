import type { Metadata } from "next";

import { Badge, Card, PageHeading } from "@/components/ui";
import { listAuditLog, listAuditLogActions } from "@/db/audit-log";
import { requireOwner } from "@/lib/auth/require-owner";

import { DataTable, OwnerNav, OwnerPageError, formatDay } from "../owner-ui";

export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

/** One line of "what happened, in plain words" for each logged action. */
function describeAction(action: string): string {
  const known: Record<string, string> = {
    "account.grant": "Granted access",
    "account.revoke": "Revoked access",
    "account.note": "Updated an account note",
    "settings.update": "Changed settings",
    "gift_code.generate": "Generated gift codes",
    "gift_code.disable": "Disabled a gift code",
    "question_report.resolve": "Resolved a question report",
    "question_report.dismiss": "Dismissed a question report",
  };
  return known[action] ?? action;
}

/** A short, one-line rendering of a metadata object — enough to see what
 * changed without a JSON viewer, on a screen read by one person who knows
 * what they are looking at. */
function formatMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") return "—";
  const entries = Object.entries(metadata as Record<string, unknown>);
  if (entries.length === 0) return "—";
  return entries
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join(" · ");
}

/**
 * The last 200 mutating owner actions, newest first.
 *
 * Every row here was written by `ownerAction` (`src/lib/owner/audited-action.ts`)
 * at the moment its mutation actually happened — nothing here is written by
 * hand from an individual action, which is what makes this list complete
 * rather than "complete for whichever actions remembered to log themselves".
 */
export default async function OwnerAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string | string[] }>;
}) {
  await requireOwner();

  const query = await searchParams;
  const rawAction = Array.isArray(query.action) ? (query.action[0] ?? "") : (query.action ?? "");
  const actionFilter = rawAction.trim() === "" ? null : rawAction.trim();

  let entries: Awaited<ReturnType<typeof listAuditLog>>;
  let actions: Awaited<ReturnType<typeof listAuditLogActions>>;
  try {
    [entries, actions] = await Promise.all([
      listAuditLog({ action: actionFilter }),
      listAuditLogActions(),
    ]);
  } catch (error) {
    console.error("Failed to load the audit log:", error);
    return (
      <>
        <PageHeading title="Audit log" />
        <OwnerNav current="/owner/audit-log" />
        <OwnerPageError detail={(error as Error).message} />
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Audit log"
        subtitle="Every mutating action taken from this console, newest first. The last 200 entries."
      />
      <OwnerNav current="/owner/audit-log" />

      <Card className="mb-6">
        <form action="/owner/audit-log" method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label htmlFor="action" className="block text-sm font-medium text-foreground">
              Filter by action
            </label>
            <select
              id="action"
              name="action"
              defaultValue={actionFilter ?? ""}
              className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
            >
              <option value="">All actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {describeAction(action)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
          >
            Filter
          </button>
        </form>
      </Card>

      <DataTable
        headers={["When", "Who", "Action", "Target", "Details"]}
        empty={
          actionFilter ? "No entries match that filter." : "Nothing has been logged yet."
        }
        rowKey={(_row, index) => entries[index]?.id ?? index}
        rows={entries.map((entry) => [
          <span key="when" className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDay(entry.createdAt)}
          </span>,
          <span key="who" className="break-all text-xs">
            {entry.actorEmail}
          </span>,
          <Badge key="action" tone="brand">
            {describeAction(entry.action)}
          </Badge>,
          <span key="target" className="text-xs text-muted-foreground">
            {entry.targetType}
            {entry.targetId ? (
              <span className="block break-all font-mono">{entry.targetId}</span>
            ) : null}
          </span>,
          <span key="metadata" className="text-xs text-muted-foreground">
            {formatMetadata(entry.metadata)}
          </span>,
        ])}
      />
    </>
  );
}
