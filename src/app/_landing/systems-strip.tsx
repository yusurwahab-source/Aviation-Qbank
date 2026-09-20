import Link from "next/link";

import { Badge } from "@/components/ui";
import { SystemIcon } from "@/components/system-icon";
import { systemEntry } from "@/config/systems";
import type { TopicSummary } from "@/db/queries";
import { buildTestHref } from "@/lib/test-options";

import { SectionHeading } from "./section-heading";

/**
 * Every system in the bank as a horizontal strip, each card carrying both
 * ways to sit it.
 *
 * This replaces the grid that used to be here, and the change is about how
 * many taps it takes to start. The grid linked a system to the test page and
 * let the mode default to study, so choosing an exam meant landing on the
 * test builder and finding the setting — a second screen for a decision a
 * student has usually already made. Both are on the card now, which is the
 * whole point: Study and Exam are the two things anyone comes here to do,
 * and neither should be behind a page.
 *
 * A strip rather than a grid because fifteen systems is a list to browse,
 * not a wall to read. On a phone it is a thumb-flick along one row with the
 * next card always half in view, which is what tells you it scrolls — no
 * arrows, no dots, no script. On a wide screen it is the same row with more
 * of it visible at once.
 *
 * Counts are whatever `listTopics` actually returned — the same query the
 * test builder uses — so this can never overstate the bank.
 */
export function SystemsStrip({
  aircraftCode,
  topics,
}: {
  aircraftCode: string;
  topics: TopicSummary[];
}) {
  return (
    <section id="whats-inside" className="scroll-mt-20">
      <SectionHeading
        eyebrow="What's inside"
        title="Every 737-800 system, one FCOM chapter at a time"
        subtitle="Pick a system and start — study it with the explanations in front of you, or sit it against the clock."
      />

      {/*
       * The strip bleeds into the page's own gutter and scrolls inside
       * itself, so a card can sit flush to the screen edge on a phone
       * without the page ever scrolling sideways. The negative margins
       * match `<main>`'s padding exactly (px-4, sm:px-5); anything else
       * would leave a seam or an overflow.
       *
       * `.scroll-strip` rather than Tailwind's own `overflow-x-auto` and
       * `snap-*`: those get the scrolling right and still let the overflow
       * count toward the document's width — see the note on the class in
       * `globals.css` for the measurement.
       *
       * The two details that are easy to get wrong here, both measured in a
       * browser rather than reasoned about:
       *
       *  - `scroll-pl-*` has to match `px-*`. A snap target aligns to the
       *    snapport's edge, which is the padding box, so without it the
       *    browser scrolls the strip by exactly the padding on load and the
       *    first card sits flush against the screen edge with no gutter.
       *  - `w-max` on the list. As a block-level flex child it would
       *    otherwise be the content box's width with its items spilling out,
       *    and a scroll container does not honour its own end padding
       *    against spilled content — so the last card ended flush right.
       *    Sized to its content, both gutters hold.
       */}
      <div className="scroll-strip -mx-4 mt-8 scroll-pl-4 px-4 pb-4 sm:-mx-5 sm:scroll-pl-5 sm:px-5">
        <ul className="flex w-max gap-3 sm:gap-4">
          {topics.map((topic) => {
            const entry = systemEntry(topic.topic);

            return (
              <li
                key={topic.topic}
                className="flex w-[15.5rem] shrink-0 snap-start flex-col rounded-xl border border-border bg-surface p-4 transition hover:border-brand sm:w-[17rem]"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <SystemIcon icon={entry.icon} className="h-5 w-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      {/* Two lines, then clip: a strip of cards that grow to
                          fit the longest section name would leave every
                          other card half empty. */}
                      <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                        {topic.topic}
                      </h3>
                      {entry.free ? <Badge tone="brand">Free</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {topic.questionCount} {topic.questionCount === 1 ? "question" : "questions"}
                    </p>
                  </div>
                </div>

                {/* `mt-auto` so the two buttons line up across the row
                    whether a section's name wrapped to two lines or one. */}
                <div className="mt-auto flex gap-2 pt-4">
                  <Link
                    href={buildTestHref(aircraftCode, { topics: [topic.topic], mode: "study" })}
                    className="tap-target inline-flex flex-1 items-center justify-center rounded-lg bg-brand px-3 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
                  >
                    Study
                    <span className="sr-only"> {topic.topic}</span>
                  </Link>
                  <Link
                    href={buildTestHref(aircraftCode, { topics: [topic.topic], mode: "exam" })}
                    className="tap-target inline-flex flex-1 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
                  >
                    Exam
                    <span className="sr-only"> {topic.topic}</span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Study marks each answer as you give it, with the explanation. Exam holds everything to
        the end and gives you a minute a question.{" "}
        <Link
          href={`/aircraft/${aircraftCode}`}
          className="font-medium text-brand hover:underline"
        >
          Build a test across several systems
        </Link>
        .
      </p>
    </section>
  );
}
