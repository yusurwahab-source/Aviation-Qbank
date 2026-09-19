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
  { href: "/owner/accounts", label: "Accounts" },
  { href: "/owner/subscribers", label: "Subscribers" },
  { href: "/owner/gift-codes", label: "Gift codes" },
  { href: "/owner/interest", label: "Aircraft requests" },
  { href: "/owner/settings", label: "Settings" },
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
                : "border border-border bg-surface text-muted-foreground hover:border-brand hover:text-brand"
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
 * A table that turns into stacked rows on a phone rather than scrolling
 * sideways — the owner checks these on the same 375px screen everything
 * else in this app was measured at.
 */
export function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: ReactNode[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">{empty}</p>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
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
  );
}

/** One date, formatted the same way everywhere in this area. */
export function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
