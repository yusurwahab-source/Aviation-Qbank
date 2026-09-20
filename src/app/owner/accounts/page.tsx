import Link from "next/link";
import type { Metadata } from "next";

import { Badge, Card, PageHeading } from "@/components/ui";
import { ACCOUNTS_PAGE_SIZE, listAccounts, type AccountStatusFilter } from "@/db/owner";
import { daysRemaining, hasActiveSubscription } from "@/lib/billing/access-policy";
import { requireOwner } from "@/lib/auth/require-owner";

import { DataTable, OwnerNav, OwnerPageError, formatDay, renderOwnerPage } from "../owner-ui";
import { AccessForm } from "./access-form";

export const metadata: Metadata = { title: "Accounts" };
export const dynamic = "force-dynamic";

const STATUS_FILTERS: { value: AccountStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring_soon", label: "Expiring soon" },
  { value: "lapsed", label: "Lapsed" },
  { value: "free_tier", label: "Free tier" },
];

function firstOf(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * Every account, paginated and filterable, with what it has done and what
 * access it has.
 *
 * "/owner/subscribers" answers "who is paying"; this answers "who is here",
 * which is a different and usually longer list — most accounts never
 * subscribe, and those are exactly the ones somebody asks about when they
 * want a free month. Search and the status filter are both plain GET
 * fields: the query lives in the URL, so a result — or a page of one — can
 * be linked to and a refresh does not lose it.
 */
export default async function OwnerAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; status?: string | string[]; page?: string | string[] }>;
}) {
  const query = await searchParams;
  return renderOwnerPage(
    () => renderAccounts(query),
    (detail: string) => (
      <>
        <PageHeading
          title="Accounts"
          subtitle="Everyone who has signed up, what they have done, and what access they have."
        />
        <OwnerNav current="/owner/accounts" />
        <OwnerPageError detail={detail} />
      </>
    ),
  );
}

async function renderAccounts(query: {
  q?: string | string[];
  status?: string | string[];
  page?: string | string[];
}) {
  const search = firstOf(query.q);
  const rawStatus = firstOf(query.status);
  const statusFilter: AccountStatusFilter = STATUS_FILTERS.some((f) => f.value === rawStatus)
    ? (rawStatus as AccountStatusFilter)
    : "all";
  const page = Math.max(1, Number.parseInt(firstOf(query.page), 10) || 1);
  const offset = (page - 1) * ACCOUNTS_PAGE_SIZE;

  await requireOwner();
  const { rows: accounts, total } = await listAccounts({
    search: search || null,
    statusFilter,
    limit: ACCOUNTS_PAGE_SIZE,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / ACCOUNTS_PAGE_SIZE));

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/owner/accounts?${qs}` : "/owner/accounts";
  }

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

        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => {
            const active = filter.value === statusFilter;
            const params = new URLSearchParams();
            if (search) params.set("q", search);
            if (filter.value !== "all") params.set("status", filter.value);
            const href = params.toString() ? `/owner/accounts?${params}` : "/owner/accounts";

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

      <p className="mb-3 text-sm text-muted-foreground">
        {total} {total === 1 ? "account" : "accounts"}
        {search ? ` matching “${search}”` : ""}
        {statusFilter !== "all"
          ? ` · ${STATUS_FILTERS.find((f) => f.value === statusFilter)?.label.toLowerCase()}`
          : ""}
        {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
      </p>

      <DataTable
        headers={["Account", "Activity", "Access", "Grant or revoke"]}
        empty={
          search || statusFilter !== "all"
            ? "No account matches that search and filter."
            : "Nobody has signed up yet."
        }
        rowKey={(_row, index) => accounts[index]?.id ?? index}
        rows={accounts.map((account) => {
          const live = hasActiveSubscription({
            status: account.status ?? "canceled",
            currentPeriodEnd: account.currentPeriodEnd,
          });
          const left = daysRemaining(account.currentPeriodEnd);

          return [
            <span key="account">
              <Link href={`/owner/accounts/${account.id}`} className="font-medium text-brand hover:underline">
                <span className="block break-all">{account.email}</span>
              </Link>
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

      {totalPages > 1 ? (
        <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Pagination">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="min-h-11 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-brand hover:text-brand"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="min-h-11 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-brand hover:text-brand"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}

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
