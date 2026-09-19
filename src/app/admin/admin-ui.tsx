import type { ReactNode } from "react";

import { Card } from "@/components/ui";

/**
 * The small shared pieces this area is built from — deliberately its own
 * copy of the shape `owner/owner-ui.tsx` already has, rather than an import
 * across route folders: two small table components are a smaller cost than
 * coupling `/admin` to `/owner`'s internals for a shared helper neither
 * area is defined by. See the note on `requireAdmin` for how this area
 * relates to `/owner`.
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

export function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
