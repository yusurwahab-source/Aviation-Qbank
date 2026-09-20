import type { Metadata } from "next";

import { Card, PageHeading } from "@/components/ui";
import { listAircraftInterest, tallyAircraftInterest } from "@/db/owner";
import { requireOwner } from "@/lib/auth/require-owner";

import { DataTable, OwnerNav, OwnerPageError, describeError, formatDay, isNextControlFlowError } from "../owner-ui";

export const metadata: Metadata = { title: "Aircraft requests" };
export const dynamic = "force-dynamic";

/**
 * "Which aircraft next?" — the landing page's capture, finally readable.
 *
 * The tally is the point and the list is the evidence: the decision this
 * data exists to inform is which bank to write next, and that is a question
 * about counts, not about individual rows. The addresses matter afterwards,
 * for telling those people when their type ships.
 */
export default async function OwnerInterestPage() {
  let tally: Awaited<ReturnType<typeof tallyAircraftInterest>>;
  let rows: Awaited<ReturnType<typeof listAircraftInterest>>;
  try {
    await requireOwner();
    [tally, rows] = await Promise.all([tallyAircraftInterest(), listAircraftInterest()]);
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    console.error("Failed to load aircraft interest:", error);
    return (
      <>
        <PageHeading title="Aircraft requests" />
        <OwnerNav current="/owner/interest" />
        <OwnerPageError detail={describeError(error)} />
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Aircraft requests"
        subtitle={`${rows.length} ${rows.length === 1 ? "person has" : "people have"} asked for a type that isn't in the bank yet.`}
      />
      <OwnerNav current="/owner/interest" />

      {tally.length > 0 ? (
        <Card className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Most asked for</h2>
          <ul className="space-y-2">
            {tally.map((row) => (
              <li key={row.aircraft} className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-foreground">{row.aircraft}</span>
                <span className="text-sm font-semibold tabular-nums text-brand">
                  {row.requests}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold text-foreground">Every request</h2>

      <DataTable
        headers={["Aircraft", "Email", "Asked"]}
        empty="Nobody has asked for an aircraft yet."
        rows={rows.map((row) => [
          row.aircraft,
          <span key="email" className="break-all text-xs">
            {row.email}
          </span>,
          <span key="when" className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDay(row.createdAt)}
          </span>,
        ])}
      />
    </>
  );
}
