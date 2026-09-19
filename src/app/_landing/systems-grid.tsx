import Link from "next/link";

import { Badge } from "@/components/ui";
import { SystemIcon } from "@/components/system-icon";
import { systemEntry } from "@/config/systems";
import type { TopicSummary } from "@/db/queries";
import { buildTestHref } from "@/lib/test-options";

import { SectionHeading } from "./section-heading";

/**
 * Every system in the bank, each card a direct link into a practice test for
 * that section alone. Counts are whatever `listTopics` actually returned —
 * the same query the test builder uses — so this can never overstate the
 * bank.
 */
export function SystemsGrid({
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
        subtitle="Tap a system to start a practice test on just that section."
      />

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => {
          const entry = systemEntry(topic.topic);
          const href = buildTestHref(aircraftCode, { topics: [topic.topic] });

          return (
            <li key={topic.topic}>
              <Link
                href={href}
                className="flex h-full items-start gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-brand hover:shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <SystemIcon icon={entry.icon} className="h-5 w-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{topic.topic}</span>
                    {entry.free ? <Badge tone="brand">Free</Badge> : null}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {topic.questionCount} {topic.questionCount === 1 ? "question" : "questions"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
