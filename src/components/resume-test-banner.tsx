import Link from "next/link";

import type { IncompleteSession } from "@/db/attempts";
import { buildResumeHref } from "@/lib/test-options";

/**
 * "Resume your test" — shown on the type rating or class rating overview
 * page (scoped to that one) and on the dashboard (whichever aircraft the
 * student was last mid-way through). The link always carries the session's
 * own `?t=`, which is what the test page reads to resume this exact attempt
 * rather than draw a new random set — see `buildResumeHref`.
 */
export function ResumeTestBanner({
  session,
  aircraftName,
  hrefBuilder = buildResumeHref,
}: {
  session: IncompleteSession;
  /** Falls back to the code when the caller has not already looked the
   * aircraft up for something else — not worth a query of its own here. */
  aircraftName?: string;
  /** `buildResumeHref` by default (`/type-rating/CODE/test`) — a class
   * rating's overview page passes `buildClassResumeHref` instead. */
  hrefBuilder?: typeof buildResumeHref;
}) {
  const scope =
    session.topics.length === 0
      ? null
      : session.topics.length === 1
        ? session.topics[0]
        : `${session.topics.length} sections`;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand bg-brand-soft p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Resume your {session.mode === "exam" ? "exam" : "test"} on{" "}
          {aircraftName ?? session.aircraftCode}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {session.answeredCount} of {session.questionCount} answered
          {scope ? ` · ${scope}` : ""}
        </p>
      </div>
      <Link
        href={hrefBuilder(session)}
        className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
      >
        Resume
      </Link>
    </div>
  );
}
