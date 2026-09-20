import type { Metadata } from "next";

import { Badge, PageHeading } from "@/components/ui";
import { listSubscribers } from "@/db/owner";
import { daysRemaining, hasActiveSubscription } from "@/lib/billing/access-policy";
import { requireOwner } from "@/lib/auth/require-owner";

import { DataTable, OwnerNav, OwnerPageError, describeError, formatDay, isNextControlFlowError } from "../owner-ui";

export const metadata: Metadata = { title: "Subscribers" };
export const dynamic = "force-dynamic";

/**
 * Who has access, where it came from, and when it runs out.
 *
 * "Active" is decided by `hasActiveSubscription`, the same function the
 * paywall itself uses — not by reading `status` alone. A row can say
 * `active` and still be over, and the owner should see what the student
 * sees, not what the column says.
 */
export default async function OwnerSubscribersPage() {
  let rows: Awaited<ReturnType<typeof listSubscribers>>;
  try {
    await requireOwner();
    rows = await listSubscribers();
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    console.error("Failed to list subscribers:", error);
    return (
      <>
        <PageHeading title="Subscribers" />
        <OwnerNav current="/owner/subscribers" />
        <OwnerPageError detail={describeError(error)} />
      </>
    );
  }

  const active = rows.filter((row) =>
    hasActiveSubscription({ status: row.status, currentPeriodEnd: row.currentPeriodEnd }),
  ).length;

  return (
    <>
      <PageHeading
        title="Subscribers"
        subtitle={`${active} with access right now, out of ${rows.length} who have ever had a subscription.`}
      />
      <OwnerNav current="/owner/subscribers" />

      <DataTable
        headers={["Account", "Plan", "Source", "Access", "Ends"]}
        empty="Nobody has subscribed yet."
        rows={rows.map((row) => {
          const live = hasActiveSubscription({
            status: row.status,
            currentPeriodEnd: row.currentPeriodEnd,
          });
          const left = daysRemaining(row.currentPeriodEnd);

          return [
            <span key="email" className="break-all">
              {row.email}
            </span>,
            row.plan,
            <Badge key="source" tone={row.provider === "gift" ? "flag" : "brand"}>
              {row.provider}
            </Badge>,
            live ? (
              <span key="access">
                <Badge tone="correct">Active</Badge>
                {left !== null ? (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {left} {left === 1 ? "day" : "days"} left
                  </span>
                ) : null}
              </span>
            ) : (
              <Badge key="access" tone="incorrect">
                {row.status === "active" ? "Lapsed" : row.status}
              </Badge>
            ),
            <span key="ends" className="whitespace-nowrap text-xs text-muted-foreground">
              {row.currentPeriodEnd ? formatDay(row.currentPeriodEnd) : "not confirmed"}
            </span>,
          ];
        })}
      />
    </>
  );
}
