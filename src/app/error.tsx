"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Card, PageHeading } from "@/components/ui";

/**
 * The 500 boundary for everything under the root layout — the header,
 * footer and theme toggle all stay mounted around this, since only the
 * page itself threw. `DatabaseUnavailable` already covers the one error
 * every data-reading page expects and catches itself; this is what runs
 * for anything that got past that, an actual bug rather than a down
 * database.
 */
export default function GlobalPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled page error:", error);
  }, [error]);

  return (
    <>
      <PageHeading title="Something went wrong" />
      <Card>
        <p className="text-sm text-muted-foreground">
          That page hit a problem loading. It has been logged — try again, or head back to the
          aircraft.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="tap-target inline-flex items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
          >
            Try again
          </button>
          <Link
            href="/aircraft"
            className="tap-target inline-flex items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
          >
            Back to the aircraft
          </Link>
        </div>
      </Card>
    </>
  );
}
