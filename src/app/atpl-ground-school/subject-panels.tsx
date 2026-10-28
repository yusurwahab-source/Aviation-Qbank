import Link from "next/link";

import { Badge } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import type { AtplRow } from "@/lib/atpl-subjects";
import { buildFlyingKnowledgeTestHref } from "@/lib/test-options";

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
            <div className="flex flex-wrap gap-3">
              <Link href={`/flying-knowledge/${live.code}`} className={buttonVariants()}>
                Question bank →
              </Link>
              {guideHref ? (
                <a
                  href={guideHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Study guide ↗
                </a>
              ) : null}
            </div>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Chapters</h3>
              {live.chapters.length === 0 ? (
                <p className="text-sm text-muted-foreground">No chapters published yet.</p>
              ) : (
                <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {live.chapters.map((chapter) => (
                    <li key={chapter.topic}>
                      <Link
                        href={buildFlyingKnowledgeTestHref(live.code, { topics: [chapter.topic] })}
                        className="tap-target flex h-full items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm transition-colors hover:border-brand-ink"
                      >
                        <span className="font-medium text-foreground">{chapter.topic}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {chapter.questionCount} Q
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
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
