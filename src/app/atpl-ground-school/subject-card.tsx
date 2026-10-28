"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { Badge } from "@/components/ui";
import type { AtplRow } from "@/lib/atpl-subjects";
import { buildFlyingKnowledgeTestHref } from "@/lib/test-options";

/**
 * One ATPL subject as a cover card. The cover is the toggle: opening it
 * widens the card to the full row and lists the subject's chapters, each
 * with its question count and a link straight into a test on that chapter.
 * A subject with no bank yet is an inert cover that says so.
 */
export function SubjectCard({
  row,
  guideHref,
  hiddenFromStudents,
}: {
  row: AtplRow;
  guideHref: string | null;
  hiddenFromStudents: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const live = row.live;

  const cover = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-on-hero opacity-80">
          EASA ATPL
        </span>
        <span className="font-mono text-2xl font-bold leading-none text-hero-accent">
          {row.number}
        </span>
      </span>
      <span className="mt-auto block text-lg font-semibold leading-snug text-on-hero">
        {row.name}
      </span>
      <span className="mt-3 block h-0.5 w-10 rounded-full bg-hero-accent" aria-hidden="true" />
    </>
  );

  const coverClass =
    "relative flex min-h-40 w-full flex-col overflow-hidden rounded-t-xl bg-hero-scrim p-5 text-left";

  return (
    <article
      className={`flex flex-col rounded-xl border border-border bg-surface shadow-sm transition-shadow ${
        open ? "sm:col-span-2 lg:col-span-3" : "hover:shadow-md"
      } ${live ? "" : "opacity-70"}`}
    >
      {live ? (
        <button
          type="button"
          className={`${coverClass} cursor-pointer`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          {cover}
          <span className="sr-only">{open ? "Hide chapters" : "Show chapters"}</span>
        </button>
      ) : (
        <div className={coverClass}>{cover}</div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {live ? (
            <>
              <Badge tone="brand">{live.publishedQuestions.toLocaleString("en-GB")} questions</Badge>
              {live.chapters.length > 0 ? (
                <Badge>{live.chapters.length} chapters</Badge>
              ) : null}
            </>
          ) : (
            <Badge>Coming soon</Badge>
          )}
          {hiddenFromStudents ? <Badge>Hidden from students</Badge> : null}
        </div>

        {live ? (
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              className="link-standalone inline-flex items-center gap-1 text-sm font-medium text-brand-ink hover:underline"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? "Hide chapters" : "Chapters"}
              <span
                className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>
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
              Question bank →
            </Link>
          </div>
        ) : null}

        {live ? (
          <div id={panelId} hidden={!open} className="border-t border-border pt-3">
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
          </div>
        ) : null}
      </div>
    </article>
  );
}
