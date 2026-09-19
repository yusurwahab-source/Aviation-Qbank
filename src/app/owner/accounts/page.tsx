import type { Metadata } from "next";

import { Badge, Card, PageHeading } from "@/components/ui";
import { listAccounts } from "@/db/owner";
import { daysRemaining, hasActiveSubscription } from "@/lib/billing/access-policy";
import { requireOwner } from "@/lib/auth/require-owner";

import { DataTable, OwnerNav, formatDay } from "../owner-ui";
import { AccessForm } from "./access-form";

export const metadata: Metadata = { title: "Accounts" };
export const dynamic = "force-dynamic";

/**
 * Every account, and the one lever the owner has over each of them.
 *
 * `/owner/subscribers` answers "who is paying"; this answers "who is here",
 * which is a different and usually longer list — most accounts never
 * subscribe, and those are exactly the ones somebody asks about when they
 * want a free month.
 *
 * The search is a plain GET form: the query lives in the URL, so a result
 * can be linked to and a refresh does not lose it. Nothing here is a client
 * component except the per-row controls, which have to be.
 */
export default async function OwnerAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  await requireOwner();

  const query = await searchParams;
  const search = Array.isArray(query.q) ? (query.q[0] ?? "") : (query.q ?? "");
  const accounts = await listAccounts(search);

  return (
    <>
      <PageHeading
        title="Accounts"
        subtitle="Everyone who has signed up, what they have done, and what access they have."
      />
      <OwnerNav current="/owner/accounts" />

      <Card className="mb-6">
        <form action="/owner/accounts" method="get" className="flex flex-wrap gap-2">
          <label htmlFor="q" className="sr-only">
            Search by email
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Search by email"
            className="min-h-11 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
          >
            Search
          </button>
        </form>
      </Card>

      <p className="mb-3 text-sm text-muted-foreground">
        {search
          ? `${accounts.length} ${accounts.length === 1 ? "account" : "accounts"} matching “${search}”.`
          : `Showing the ${accounts.length} newest ${accounts.length === 1 ? "account" : "accounts"}. Search to find an older one.`}
      </p>

      <DataTable
        headers={["Account", "Activity", "Access", "Grant or revoke"]}
        empty={
          search
            ? "No account matches that search."
            : "Nobody has signed up yet."
        }
        rows={accounts.map((account) => {
          const live = hasActiveSubscription({
            status: account.status ?? "canceled",
            currentPeriodEnd: account.currentPeriodEnd,
          });
          const left = daysRemaining(account.currentPeriodEnd);

          return [
            <span key="account">
              <span className="block break-all">{account.email}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                joined {formatDay(account.createdAt)}
              </span>
            </span>,

            <span key="activity" className="whitespace-nowrap text-xs text-muted-foreground">
              <span className="block text-sm tabular-nums text-foreground">
                {account.answersRecorded} answered
              </span>
              {account.testsCompleted} {account.testsCompleted === 1 ? "test" : "tests"} finished
              {account.lastAnsweredAt ? (
                <span className="mt-1 block">last {formatDay(account.lastAnsweredAt)}</span>
              ) : null}
            </span>,

            <span key="access">
              {live ? (
                <>
                  <Badge tone="correct">Active</Badge>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {account.provider} · {left} {left === 1 ? "day" : "days"} left
                  </span>
                </>
              ) : account.status === null ? (
                <span className="text-xs text-muted-foreground">Free tier</span>
              ) : (
                <>
                  <Badge tone="incorrect">
                    {account.status === "active" ? "Lapsed" : account.status}
                  </Badge>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {account.provider}
                    {account.currentPeriodEnd
                      ? ` · ended ${formatDay(account.currentPeriodEnd)}`
                      : ""}
                  </span>
                </>
              )}
            </span>,

            <AccessForm
              key="actions"
              userId={account.id}
              email={account.email}
              hasSubscription={account.status !== null}
            />,
          ];
        })}
      />

      <Card className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">What these buttons do</h2>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li>
            <strong className="text-foreground">Grant</strong> adds days of full access, on top of
            whatever the account already has — it can never shorten access somebody has paid for.
          </li>
          <li>
            <strong className="text-foreground">Revoke</strong> takes access away immediately, but
            it does not cancel anything at Stripe. A Stripe subscription keeps billing, and its
            next renewal turns access back on. Cancel it in Stripe as well if that is the point.
          </li>
        </ul>
      </Card>
    </>
  );
}
