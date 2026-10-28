import Link from "next/link";

import { TestBuilder } from "@/components/practice-test/test-builder";
import { Badge } from "@/components/ui";
import type { AtplRow } from "@/lib/atpl-subjects";

/**
 * What one ATPL subject shows inside the expandable gallery: its panel (the
 * cover on the shelf) and its detail (the dialog it opens to). Both are
 * server components handed to the client gallery as finished markup.
 *
 * The detail is where a test starts: the same `TestBuilder` the subject's
 * own page uses, over its chapters, with study or exam mode. It has no
 * presets (weak, flagged, wrong, unseen) — those are per student and per
 * subject, and computing them for all thirteen on every visit is not worth
 * it here; the subject's page, linked beside the builder, has them.
 *
 * A panel is a `@container`. Below 16rem it is a book spine: the syllabus
 * number over the name set vertically. Wider, and on a phone where every
 * panel has the full width, it is the cover: number, name and counts.
 */
export function SubjectPanel({ row, hiddenFromStudents }: { row: AtplRow; hiddenFromStudents: boolean }) {
  const counts = row.live
    ? `${row.live.publishedQuestions.toLocaleString("en-GB")} questions · ${row.live.chapters.length} chapters`
    : "Coming soon";

  return (
    <>
      <span className="flex h-full items-center gap-4 p-4 @max-3xs:hidden lg:flex-col lg:items-stretch">
        <span className="font-mono text-xl font-bold leading-none text-hero-accent lg:self-end">
          {row.number}
        </span>
        <span className="flex min-w-0 flex-col gap-1 lg:mt-auto">
          <span className="text-base font-semibold leading-snug lg:text-lg">{row.name}</span>
          <span className="text-xs opacity-80">
            {counts}
            {hiddenFromStudents ? " · Hidden from students" : ""}
          </span>
          <span className="mt-1 hidden h-0.5 w-10 rounded-full bg-hero-accent lg:block" aria-hidden="true" />
        </span>
      </span>

      <span className="hidden h-full flex-col items-center gap-3 py-4 @max-3xs:flex">
        <span className="font-mono text-base font-bold leading-none text-hero-accent">{row.number}</span>
        <span className="min-h-0 flex-1 rotate-180 overflow-hidden text-sm font-semibold leading-tight [writing-mode:vertical-rl]">
          {row.name}
        </span>
      </span>
    </>
  );
}

export function SubjectDetail({
  row,
  guideHref,
  hiddenFromStudents,
}: {
  row: AtplRow;
  guideHref: string | null;
  hiddenFromStudents: boolean;
}) {
  const live = row.live;

  return (
    <div className="flex flex-col">
      <div className="bg-hero-scrim p-5 text-on-hero">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-hero-accent">
          EASA ATPL {row.number}
        </p>
        <p className="mt-1 text-xl font-semibold leading-snug">{row.name}</p>
        <span className="mt-3 block h-0.5 w-10 rounded-full bg-hero-accent" aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {live ? (
            <>
              <Badge tone="brand">{live.publishedQuestions.toLocaleString("en-GB")} questions</Badge>
              <Badge>{live.chapters.length} chapters</Badge>
            </>
          ) : (
            <Badge>Coming soon</Badge>
          )}
          {hiddenFromStudents ? <Badge>Hidden from students</Badge> : null}
        </div>

        {live ? (
          <>
            <div className="flex flex-wrap items-center gap-x-5">
              {guideHref ? (
                <a
                  href={guideHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-standalone text-sm font-medium text-brand-ink hover:underline"
                >
                  Study guide ↗
                </a>
              ) : null}
              <Link
                href={`/flying-knowledge/${live.code}`}
                className="link-standalone text-sm font-medium text-brand-ink hover:underline"
              >
                Subject page: progress, flagged and unseen →
              </Link>
            </div>

            {live.chapters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No chapters published yet.</p>
            ) : (
              <TestBuilder
                aircraftCode={live.code}
                topics={live.chapters}
                remainingFree={null}
                basePath="/flying-knowledge"
                unit="chapter"
              />
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            This subject&apos;s question bank is being written. It will open here when it is ready.
          </p>
        )}
      </div>
    </div>
  );
}
