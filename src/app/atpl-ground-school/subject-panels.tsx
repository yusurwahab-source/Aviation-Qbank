import Link from "next/link";

import { TestBuilder } from "@/components/practice-test/test-builder";
import { Badge } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import type { AtplRow } from "@/lib/atpl-subjects";

/**
 * What one ATPL subject shows inside the expandable gallery: its panel (the
 * cover on the shelf) and its detail (the dialog it opens to). Both are
 * server components handed to the client gallery as finished markup.
 *
 * A panel is a `@container`. Below 16rem it is a book spine: the syllabus
 * number over the name set vertically. Wider, and on a phone where every
 * panel has the full width, it is the cover: number, name and counts.
 */
export function SubjectPanel({ row, hiddenFromStudents }: { row: AtplRow; hiddenFromStudents: boolean }) {
  const counts = row.live
    ? `${row.live.publishedQuestions.toLocaleString("en-GB")} Q · ${row.live.chapters.length} chapters`
    : "Coming soon";

  return (
    <>
      <span className="flex h-full items-center gap-4 p-4 @max-3xs:hidden lg:flex-col lg:items-stretch">
        <div className="flex items-center justify-between w-full lg:self-end">
          <span className="font-mono text-xl font-bold leading-none text-hero-accent">
            {row.number}
          </span>
          {row.live ? (
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm" title="Active question bank" />
          ) : (
            <span className="text-[10px] font-medium text-white/50 uppercase">Draft</span>
          )}
        </div>
        <span className="flex min-w-0 flex-col gap-1 lg:mt-auto">
          <span className="text-base font-semibold leading-snug lg:text-lg">{row.name}</span>
          <span className="text-xs text-on-hero/80">
            {counts}
            {hiddenFromStudents ? " · Hidden from students" : ""}
          </span>
          <span className="mt-1 hidden h-0.5 w-10 rounded-full bg-hero-accent lg:block" aria-hidden="true" />
        </span>
      </span>

      <span className="hidden h-full flex-col items-center gap-3 py-4 @max-3xs:flex">
        <span className="font-mono text-base font-bold leading-none text-hero-accent">{row.number}</span>
        <span className="min-h-0 flex-1 rotate-180 overflow-hidden text-sm font-semibold leading-tight [writing-mode:vertical-rl] tracking-wide">
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
      <div className="bg-hero-scrim p-6 text-on-hero border-b border-border/20">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-hero-accent">
            EASA ATPL {row.number} {live ? `· ${live.code}` : ""}
          </p>
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Verified Bank
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-2xl font-bold leading-snug">{row.name}</p>
        <span className="mt-3 block h-0.5 w-12 rounded-full bg-hero-accent" aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {live ? (
            <>
              <Badge tone="brand">{live.publishedQuestions.toLocaleString("en-GB")} published questions</Badge>
              <Badge>{live.chapters.length} syllabus chapters</Badge>
              <Badge tone="neutral">Free access</Badge>
            </>
          ) : (
            <Badge>Under development</Badge>
          )}
          {hiddenFromStudents ? <Badge tone="warning">Hidden from students</Badge> : null}
        </div>

        {live ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/flying-knowledge/${live.code}/test`} className={buttonVariants()}>
                Start practice exam →
              </Link>
              <Link href={`/flying-knowledge/${live.code}`} className={buttonVariants({ variant: "outline" })}>
                Configure test builder
              </Link>
              {guideHref ? (
                <a
                  href={guideHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "ghost" })}
                >
                  Study guide ↗
                </a>
              ) : null}
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
