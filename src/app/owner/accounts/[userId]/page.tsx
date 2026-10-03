import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Badge, Card, PageHeading } from "@/components/ui";
import { getAccountDetail } from "@/db/owner";
import { daysRemaining, hasActiveSubscription } from "@/lib/billing/access-policy";
import { requireOwner } from "@/lib/auth/require-owner";

import {
  DataTable,
  OwnerNav,
  OwnerPageError,
  describeError,
  formatDay,
  isNextControlFlowError,
} from "../../owner-ui";
import { AccessForm } from "../access-form";
import { NoteForm } from "../note-form";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

/**
 * Everything the owner might want to know about one account: plan status
 * and expiry, the grant/revoke controls also shown on the list, every
 * gift code this account has redeemed, how much of the product it has
 * actually used, and the owner's own note about it.
 *
 * `notFound()` for a stale or mistyped id, the same as every other lookup
 * `grantAccess`/`revokeAccess` already guard against — this just surfaces
 * it as a page rather than a form error.
 */
export default async function OwnerAccountDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  let account: Awaited<ReturnType<typeof getAccountDetail>>;
  try {
    await requireOwner();
    account = await getAccountDetail(userId);
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    console.error("Failed to load an account's detail:", error);
    return (
      <>
        <PageHeading eyebrow="Account" title="This account" />
        <OwnerNav current="/owner/accounts" />
        <OwnerPageError detail={describeError(error)} />
      </>
    );
  }
  if (!account) notFound();

  const live = hasActiveSubscription({
    status: account.status ?? "canceled",
    currentPeriodEnd: account.currentPeriodEnd,
  });
  const left = daysRemaining(account.currentPeriodEnd);

  return (
    <>
      <PageHeading
        eyebrow="Account"
        title={account.email}
        subtitle={`Joined ${formatDay(account.createdAt)}.`}
      />
      <OwnerNav current="/owner/accounts" />

      <p className="mb-6">
        <Link href="/owner/accounts" className="text-sm text-brand-ink hover:underline">
          ← Back to all accounts
        </Link>
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Access</h2>
          {live ? (
            <p className="mb-3 text-sm text-foreground">
              <Badge tone="correct">Active</Badge>{" "}
              <span className="text-muted-foreground">
                {account.provider} plan, {account.plan}, {left} {left === 1 ? "day" : "days"} left
                {account.currentPeriodEnd ? ` (until ${formatDay(account.currentPeriodEnd)})` : ""}.
              </span>
            </p>
          ) : account.status === null ? (
            <p className="mb-3 text-sm text-muted-foreground">Free tier — no subscription yet.</p>
          ) : (
            <p className="mb-3 text-sm text-foreground">
              <Badge tone="incorrect">{account.status === "active" ? "Lapsed" : account.status}</Badge>{" "}
              <span className="text-muted-foreground">
                {account.provider} plan, {account.plan}
                {account.currentPeriodEnd ? `, ended ${formatDay(account.currentPeriodEnd)}` : ""}.
              </span>
            </p>
          )}

          <AccessForm
            userId={account.id}
            email={account.email}
            hasSubscription={account.status !== null}
          />
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Activity</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Questions answered</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {account.answersRecorded}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tests finished</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {account.testsCompleted}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Test sessions started</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {account.sessionsStarted}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Last active</dt>
              <dd className="mt-0.5 text-sm text-foreground">
                {account.lastAnsweredAt ? formatDay(account.lastAnsweredAt) : "never"}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <h2 className="mb-3 mt-6 text-lg font-semibold text-foreground">Redemption history</h2>
      <DataTable
        headers={["Code", "Plan", "Worth", "Redeemed"]}
        empty="This account has not redeemed a gift code."
        rowKey={(_row, index) => account.redemptions[index]?.code ?? index}
        rows={account.redemptions.map((redemption) => [
          <span key="code" className="font-mono text-xs">
            {redemption.code}
          </span>,
          redemption.plan,
          `${redemption.durationDays} days`,
          <span key="when" className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDay(redemption.redeemedAt)}
          </span>,
        ])}
      />

      <Card className="mt-6">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Note</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Visible only here, to you. Never shown to the account itself.
        </p>
        <NoteForm userId={account.id} note={account.note} />
      </Card>
    </>
  );
}
