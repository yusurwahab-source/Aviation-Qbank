import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui";

/**
 * The panel the short pages share.
 *
 * These pages exist because the footer links to them, and a footer that
 * links to nothing is worse than one with fewer links in it. Each one says
 * plainly what is and is not settled yet rather than pretending to be
 * finished — a page claiming to be a privacy policy while containing no
 * policy would be the one genuinely harmful version of a placeholder.
 */
export function ComingSoon({
  children,
  note,
}: {
  children: ReactNode;
  /** The honest sentence about what is still missing. */
  note?: string;
}) {
  return (
    <>
      <Card>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </Card>

      {note ? (
        <p className="mt-4 rounded-lg border border-border bg-warning-soft px-4 py-3 text-sm text-warning">
          {note}
        </p>
      ) : null}

      <p className="mt-6">
        <Link href="/" className="text-sm font-medium text-brand hover:underline">
          ← Back to the aircraft
        </Link>
      </p>
    </>
  );
}
