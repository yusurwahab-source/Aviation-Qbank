"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * The last line of defence for this area, and the reason a broken owner page
 * can no longer reach the browser as a bare platform error.
 *
 * Each page already catches its own failures and renders `OwnerPageError`
 * with the real message. That covers everything the page itself does — the
 * access check, the queries, and the building of its own rows. What it
 * cannot cover is a throw from *inside a child component*, which React
 * renders after the page function has already returned, or from the layout
 * above it. Without a boundary here those became an uncaught 500 and the
 * browser's own "a server error occurred" screen, which names nothing and
 * leaves the owner with no way back into the console.
 *
 * In production React deliberately withholds a server-side error's message
 * from this component and passes only `digest`, so this screen shows that
 * rather than pretending to more detail than it has: it is the id the same
 * error was logged under, and the one thing worth quoting when asking why.
 */
export default function OwnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Owner console error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-foreground">This page could not load</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Something failed while rendering this page, so nothing here is safe to trust. The rest of
        the console still works — the error was in this page alone.
      </p>

      {error.digest ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Reference:{" "}
          <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            {error.digest}
          </code>
        </p>
      ) : null}

      {error.message ? (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-surface-muted p-3 font-mono text-xs text-foreground">
          {error.message}
        </pre>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
        >
          Try again
        </button>
        <Link
          href="/owner"
          className="min-h-11 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-brand hover:text-brand-ink"
        >
          Back to the console
        </Link>
      </div>
    </div>
  );
}
