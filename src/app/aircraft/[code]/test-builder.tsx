"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { Badge } from "@/components/ui";
import type { TopicSummary } from "@/db/queries";
import {
  ALL_QUESTIONS,
  DEFAULT_TEST_LENGTH,
  TEST_LENGTHS,
  buildTestHref,
  resolveTestSize,
  type TestLength,
} from "@/lib/test-options";

/**
 * Builds a test: which sections to draw from, and how many questions.
 *
 * The whole point of this screen is that the student sees the consequence of
 * each choice before committing: ticking a section changes the number of
 * questions available, and asking for more than exist says so plainly rather
 * than quietly handing back a shorter test.
 *
 * The per-section counts arrive from the server, so the running total is exact
 * arithmetic here — no request per click.
 */
export function TestBuilder({
  aircraftCode,
  topics,
}: {
  aircraftCode: string;
  topics: TopicSummary[];
}) {
  const fieldId = useId();

  // Everything is selected to start with: the common case is a test over the
  // whole aircraft, and unticking is easier than hunting for the section you
  // wanted among a list of empty boxes.
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(topics.map((topic) => topic.topic)),
  );
  const [wantsAll, setWantsAll] = useState(false);
  /**
   * Kept as the raw string the student typed. Storing a number would force a
   * decision about what an empty box means the moment they clear it to type a
   * different figure.
   */
  const [typed, setTyped] = useState(String(DEFAULT_TEST_LENGTH));

  const available = useMemo(
    () =>
      topics.reduce(
        (total, topic) => (selected.has(topic.topic) ? total + topic.questionCount : total),
        0,
      ),
    [topics, selected],
  );

  const allSelected = selected.size === topics.length;
  const requested: TestLength | null = wantsAll
    ? ALL_QUESTIONS
    : /^\d+$/.test(typed.trim()) && Number.parseInt(typed, 10) >= 1
      ? Number.parseInt(typed, 10)
      : null;

  const size = requested === null ? 0 : resolveTestSize(requested, available);
  const shortened = requested !== null && requested !== ALL_QUESTIONS && requested > available;

  function toggle(topic: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  }

  const href = buildTestHref(aircraftCode, {
    // Every section selected is the same test as no filter at all, and the
    // shorter URL is the one worth sharing.
    topics: allSelected ? [] : [...selected],
    // The resolved size, not the raw request: the button says how many
    // questions the test will have, so the link it opens must deliver that
    // many. "All" stays "all" — its whole point is to follow the bank as it
    // grows, which a frozen number would not.
    length: wantsAll ? ALL_QUESTIONS : size || DEFAULT_TEST_LENGTH,
  });

  return (
    <div className="space-y-6">
      <fieldset>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <legend className="text-sm font-semibold text-foreground">Sections</legend>
          <div className="flex gap-3 text-sm">
            <button
              type="button"
              onClick={() => setSelected(new Set(topics.map((topic) => topic.topic)))}
              disabled={allSelected}
              className="font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={selected.size === 0}
              className="font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
            >
              Clear
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Tick one section to work on a single system, or several to mix them.
        </p>

        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {topics.map((topic) => {
            const checked = selected.has(topic.topic);
            return (
              <li key={topic.topic}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                    checked ? "border-brand bg-brand-soft" : "border-border bg-surface hover:border-brand"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(topic.topic)}
                    className="h-4 w-4 shrink-0 accent-[var(--brand)]"
                  />
                  <span className="text-sm font-medium text-foreground">{topic.topic}</span>
                  <span className="ml-auto">
                    <Badge>
                      {topic.questionCount} {topic.questionCount === 1 ? "question" : "questions"}
                    </Badge>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div>
        <h3 className="text-sm font-semibold text-foreground">How many questions?</h3>
        <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
          {available === 0
            ? "Choose at least one section to see how many questions are available."
            : `${available} ${available === 1 ? "question is" : "questions are"} available in your selection.`}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {TEST_LENGTHS.map((length) => {
            const active = !wantsAll && requested === length;
            return (
              <button
                key={length}
                type="button"
                onClick={() => {
                  setWantsAll(false);
                  setTyped(String(length));
                }}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-brand text-white"
                    : "border border-border bg-surface text-foreground hover:border-brand hover:text-brand"
                }`}
              >
                {length}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setWantsAll(true)}
            aria-pressed={wantsAll}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              wantsAll
                ? "bg-brand text-white"
                : "border border-border bg-surface text-foreground hover:border-brand hover:text-brand"
            }`}
          >
            All questions
          </button>

          <span className="flex items-center gap-2">
            {/* "or" reads correctly on screen but would be a useless name for
                the box itself, so the real label is on the input. */}
            <span aria-hidden="true" className="text-sm text-muted-foreground">
              or
            </span>
            <label htmlFor={fieldId} className="sr-only">
              Number of questions
            </label>
            <input
              id={fieldId}
              type="number"
              min={1}
              inputMode="numeric"
              value={wantsAll ? "" : typed}
              placeholder="any number"
              onChange={(event) => {
                setWantsAll(false);
                setTyped(event.target.value);
              }}
              className="w-32 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
            />
          </span>
        </div>

        {requested === null && !wantsAll ? (
          <p className="mt-2 text-sm text-incorrect">Enter a whole number of questions, or choose All questions.</p>
        ) : shortened ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Only {available} available in your selection, so the test will have {available}.
          </p>
        ) : null}
      </div>

      {size > 0 ? (
        <Link
          href={href}
          className="inline-block rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong"
        >
          Start test · {size} {size === 1 ? "question" : "questions"}
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="inline-block cursor-not-allowed rounded-lg bg-surface-muted px-5 py-3 text-sm font-semibold text-muted-foreground"
        >
          Start test
        </button>
      )}
    </div>
  );
}
