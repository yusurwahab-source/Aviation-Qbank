import type { ReactNode } from "react";
import Link from "next/link";

import { Card } from "@/components/ui";

/**
 * The small shared pieces the owner pages are built from.
 *
 * Deliberately plain: this area is read by one person who already knows
 * what they are looking at, so it earns clarity and density rather than the
 * explanatory framing the student-facing screens need.
 */

export const OWNER_LINKS = [
  { href: "/owner", label: "Overview" },
  { href: "/owner/insights", label: "Insights" },
  { href: "/owner/accounts", label: "Accounts" },
  { href: "/owner/subscribers", label: "Subscribers" },
  { href: "/owner/gift-codes", label: "Gift codes" },
  { href: "/owner/reports", label: "Reports" },
  { href: "/owner/interest", label: "Aircraft requests" },
  { href: "/owner/settings", label: "Settings" },
  { href: "/owner/audit-log", label: "Audit log" },
] as const;

export function OwnerNav({ current }: { current: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Owner tools">
      {OWNER_LINKS.map((link) => {
        const active = link.href === current;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`min-h-11 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-brand text-on-solid"
                : "border border-border bg-surface text-muted-foreground hover:border-brand hover:text-brand-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <p className="text-3xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}

/**
 * A table that turns into stacked cards on a phone rather than scrolling
 * sideways — the owner checks these on the same 375px screen everything
 * else in this app was measured at.
 *
 * Two markups of the same data, not one styled two ways: the `<table>` is
 * `hidden sm:block` and the card list is `sm:hidden`, so exactly one of
 * them is ever in the accessibility tree — the same split `test-runner.tsx`
 * uses between its desktop row and its mobile sticky bar.
 *
 * `rowKey`, if given, is used for the stacked card's own `key` and heading
 * (its first column otherwise) — most callers pass a React key already
 * embedded in each cell, which does not help a card that needs one row-level
 * key of its own.
 */
export function DataTable({
  headers,
  rows,
  empty,
  rowKey,
}: {
  headers: string[];
  rows: ReactNode[][];
  empty: string;
  rowKey?: (row: ReactNode[], index: number) => string | number;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">{empty}</p>
      </Card>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="bg-surface-muted text-left">
              {headers.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-border bg-surface">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 align-top text-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 sm:hidden">
        {rows.map((row, rowIndex) => (
          <li
            key={rowKey ? rowKey(row, rowIndex) : rowIndex}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <dl className="space-y-2.5">
              {row.map((cell, cellIndex) => (
                <div key={cellIndex}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {headers[cellIndex]}
                  </dt>
                  <dd className="mt-0.5 text-sm text-foreground">{cell}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Shown in place of a page's own content when reading the database for it
 * failed. Every `/owner` page reads at least one table with no try/catch of
 * its own, so an unhandled query error used to reach the browser as a bare
 * platform error page — this is instead a plain, in-app message that names
 * what failed and keeps the owner's own navigation on screen, so a failure
 * on one page (say, Accounts) does not strand them there.
 *
 * The technical detail is shown outright, unlike `DatabaseUnavailable`'s
 * generic "check your DATABASE_URL" copy aimed at a fresh clone: this area
 * has exactly one reader, who is trying to operate the live site, and the
 * actual error text is the fastest way from "this is broken" to a fix.
 */
export function OwnerPageError({ detail }: { detail: string }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-foreground">This page could not load</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Reading the database for this page failed. Reloading sometimes clears a transient error;
        if it keeps happening, this detail is what to share:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-muted p-3 font-mono text-xs text-foreground">
        {detail}
      </pre>
    </Card>
  );
}

/**
 * Whether `error` is one of Next's own internal control-flow signals —
 * `notFound()`, `redirect()`, `forbidden()`, `unauthorized()` — thrown as a
 * real `Error` with a `digest` Next's router recognises and handles itself.
 *
 * Every owner page calls `requireOwner()` before it does anything else, and
 * `requireOwner()` itself calls `notFound()` for a signed-in-as-someone-else
 * visitor — a real, working 404, not a failure. Once `requireOwner()` is
 * wrapped in the same try/catch as the page's own data fetch (so that a
 * `getCurrentUser()` database failure gets the same diagnostic
 * `OwnerPageError` instead of crashing before the try block even starts),
 * that catch would otherwise also swallow the legitimate `notFound()` and
 * render it as a generic query failure. This is the check every such catch
 * block runs first, to let Next's own signal continue on its way untouched.
 */
export function isNextControlFlowError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_")
  );
}

/**
 * Runs one owner page and, if anything it does throws, renders `fallback`
 * instead — with the failure described, and with a 200 rather than a 500.
 *
 * The status code is the whole point, and it is why `error.tsx` beside this
 * file is not enough on its own. A throw that reaches Next is answered with
 * a 500 whose body is an empty `__next_error__` shell that only becomes the
 * error boundary once the browser has run the page's JavaScript. Safari
 * showing an installed web app never gets that far: it replaces a 5xx with
 * its own "a server error occurred" screen and the digest number, which
 * names nothing and offers no way back. Catching here means the response is
 * an ordinary page, so there is nothing for the browser to override.
 *
 * `render` is a function rather than JSX so that everything a page does on
 * the way to its markup — the `.map` over its rows, a date formatted, a
 * total divided — happens inside the `try`. A page's own `try` around its
 * `await`s ends before its `return`, which leaves exactly the step where it
 * first meets real data outside any handler it can write.
 *
 * Next's own control-flow signals pass straight through: `requireOwner()`
 * raises `notFound()` for anyone who is not the owner, and that is a working
 * 404, not a failure to report.
 */
export async function renderOwnerPage(
  render: () => Promise<ReactNode>,
  fallback: (detail: string) => ReactNode,
): Promise<ReactNode> {
  try {
    return await render();
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    console.error("An owner page failed:", error);
    return fallback(describeError(error));
  }
}

/**
 * As much of what went wrong as can be put on a screen.
 *
 * `(error as Error).message` alone is not enough here: a Postgres driver
 * error carries the part that actually identifies the fault — the SQLSTATE
 * `code`, and the `detail`/`column`/`table` naming what the database
 * objected to — on its own fields, and a value thrown that is not an `Error`
 * at all has no `message` to read, which used to render an empty box. This
 * area has one reader, trying to operate the live site with no access to a
 * server log, so it gets the whole thing.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return `Non-error thrown: ${String(error)}`;

  const extras = (["code", "detail", "table", "column", "constraint"] as const)
    .map((key) => {
      const value = (error as unknown as Record<string, unknown>)[key];
      return typeof value === "string" && value !== "" ? `${key}: ${value}` : null;
    })
    .filter((line) => line !== null);

  return [`${error.name}: ${error.message}`, ...extras].join("\n");
}

/**
 * One date, formatted the same way everywhere in this area.
 *
 * Tolerates a missing or unparseable value rather than throwing on it. The
 * type says `Date`, but these rows come from the database, and a column that
 * is null in practice — or a driver handing back a string where a `Date` was
 * expected — would otherwise throw *while the page's JSX is being built*,
 * which is past the point any of this area's own error handling can reach.
 */
export function formatDay(date: Date | string | null | undefined): string {
  if (date === null || date === undefined) return "—";
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "—";
  return value.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
