"use client";

import Link from "next/link";
import { useState } from "react";

import { ScoreBar } from "@/components/ui";
import { buildTestHref } from "@/lib/test-options";
import { filterTopics, type TabTopic, type TopicTab } from "@/lib/topic-tabs";

const TABS: { value: TopicTab; label: string }[] = [
  { value: "weak", label: "Weak areas" },
  { value: "progress", label: "In progress" },
  { value: "all", label: "All systems" },
];

export function ProgressTopics({
  topics,
  aircraftCode,
}: {
  topics: TabTopic[];
  aircraftCode?: string;
}) {
  const [tab, setTab] = useState<TopicTab>("all");
  const shown = filterTopics(topics, tab);

  return (
    <>
      <div role="group" aria-label="Filter topics" className="mt-3 flex flex-wrap gap-2">
        {TABS.map((item) => {
          const count = filterTopics(topics, item.value).length;
          const active = tab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={active}
              onClick={() => setTab(item.value)}
              className={`tap-target inline-flex items-center rounded-full border px-4 text-sm font-medium transition ${
                active
                  ? "border-brand bg-brand-soft text-brand-ink"
                  : "border-border bg-surface text-foreground hover:border-brand hover:text-brand-ink"
              }`}
            >
              {item.label} ({count})
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nothing in this tab yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {shown.map((topic) => (
            <li key={topic.topic} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-medium text-foreground">{topic.topic}</span>
                <span className="text-sm text-muted-foreground">
                  {topic.answered === 0
                    ? "Not started"
                    : `${topic.correct}/${topic.answered} · ${topic.percentage}%`}
                </span>
              </div>
              <div className="mt-2">
                <ScoreBar percentage={topic.percentage} tone="score" />
              </div>
              {aircraftCode ? (
                <Link
                  href={buildTestHref(aircraftCode, { topics: [topic.topic] })}
                  className="link-standalone mt-3 text-sm font-medium text-brand-ink hover:underline"
                >
                  Practise {topic.topic} →
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
