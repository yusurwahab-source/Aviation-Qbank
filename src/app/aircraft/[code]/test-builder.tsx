"use client";

import Link from "next/link";
import { useId, useMemo, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui";
import type { TopicSummary } from "@/db/queries";
import {
  ALL_QUESTIONS,
  DEFAULT_TEST_LENGTH,
  DEFAULT_TEST_MODE,
  PRESET_COUNT_CEILING,
  TEST_LENGTHS,
  buildTestHref,
  resolveTestSize,
  timeLimitFor,
  type TestLength,
  type TestMode,
} from "@/lib/test-options";

/**
 * The quick presets, computed server-side from the student's own history —
 * see `aircraft/[code]/page.tsx`. Null signed out: none of these mean
 * anything without a history to build them from, the same gap that already
 * means a signed-out visitor sees no flags or notes.
 */
export type BuilderPresets = {
  /** The one or two topics this student is weakest in, weakest first — empty
   * until they have actually answered something. */
  weakTopics: string[];
  flaggedCount: number;
  wrongCount: number;
  unseenCount: number;
};

/** The three presets that replace section selection with a fixed list,
 * rather than pre-filling it — see the note on `activePreset` below. */
type ListPreset = "flagged" | "wrong" | "unseen";

/**
 * Builds a test: which sections to draw from, how many questions, and whether
 * it marks as you go or holds everything to the end.
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
  /**
   * How many questions of the caller's allowance are left on this aircraft,
   * or null for no cap (an active subscription). `/test` enforces this
   * regardless; this is what keeps the button honest about it rather than
   * advertising a size it will not actually deliver.
   *
   * Signed out this is the *preview* allowance rather than the free tier —
   * see `allowanceKind` below. It used to be null there, which is exactly
   * what let the button offer a visitor every question in the bank.
   */
  remainingFree = null,
  /**
   * Which allowance `remainingFree` is counting, and so what to say when it
   * runs out: a signed-in student needs to subscribe, a signed-out visitor
   * needs an account first. The number is the same shape either way, which
   * is why one prop carries both.
   */
  allowanceKind = "free-tier",
  presets = null,
}: {
  aircraftCode: string;
  topics: TopicSummary[];
  remainingFree?: number | null;
  allowanceKind?: "free-tier" | "preview";
  presets?: BuilderPresets | null;
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
  const [mode, setMode] = useState<TestMode>(DEFAULT_TEST_MODE);
  /**
   * "Questions I got wrong", "My flagged questions" and "Unseen questions"
   * each replace the Sections fieldset with a fixed list the server already
   * knows how to build — there is no combination of checkboxes that means
   * the same thing, so picking one of these *disables* section selection
   * rather than pre-filling it. "All systems" and "My weak systems" are the
   * opposite: both are just a particular set of ticked boxes, so they set
   * `selected` directly and never touch this.
   */
  const [activePreset, setActivePreset] = useState<ListPreset | null>(null);

  const sectionsAvailable = useMemo(
    () =>
      topics.reduce(
        (total, topic) => (selected.has(topic.topic) ? total + topic.questionCount : total),
        0,
      ),
    [topics, selected],
  );

  const presetCount: Record<ListPreset, number> = {
    flagged: presets?.flaggedCount ?? 0,
    wrong: presets?.wrongCount ?? 0,
    unseen: presets?.unseenCount ?? 0,
  };
  const available = activePreset ? presetCount[activePreset] : sectionsAvailable;

  const allSelected = selected.size === topics.length;
  const requested: TestLength | null = wantsAll
    ? ALL_QUESTIONS
    : /^\d+$/.test(typed.trim()) && Number.parseInt(typed, 10) >= 1
      ? Number.parseInt(typed, 10)
      : null;

  const requestedSize = requested === null ? 0 : resolveTestSize(requested, available);
  // "Wrong" and "flagged" both draw only from questions already answered
  // once, which the free tier has never charged for — the same reasoning
  // that exempts a retry test in `test/page.tsx`. "Unseen" is the opposite
  // case by definition, so it is metered exactly like a normal fresh pick.
  const freeTierApplies = activePreset !== "wrong" && activePreset !== "flagged";
  const size =
    remainingFree === null || !freeTierApplies
      ? requestedSize
      : Math.min(requestedSize, remainingFree);
  /**
   * What an exam of this size is worth, in minutes. Shown on the Exam card so
   * the student sees the clock they are choosing before they choose it —
   * there is nothing to set, only something to know.
   */
  const examSeconds = timeLimitFor("exam", size);
  const examMinutes = size > 0 && examSeconds !== null ? examSeconds / 60 : 0;
  const shortenedBySection =
    requested !== null && requested !== ALL_QUESTIONS && requested > available;
  // Whichever cut it down further is the one worth explaining — no point
  // naming the section limit when the free allowance is the tighter one.
  const shortenedByFreeLimit =
    freeTierApplies && remainingFree !== null && requestedSize > remainingFree;

  function toggle(topic: string) {
    setActivePreset(null);
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  }

  const href = activePreset
    ? buildTestHref(aircraftCode, {
        retryOnly: activePreset === "wrong",
        from: activePreset === "flagged" || activePreset === "unseen" ? activePreset : undefined,
        length: wantsAll ? ALL_QUESTIONS : size || DEFAULT_TEST_LENGTH,
        mode,
      })
    : buildTestHref(aircraftCode, {
        // Every section selected is the same test as no filter at all, and the
        // shorter URL is the one worth sharing.
        topics: allSelected ? [] : [...selected],
        // The resolved size, not the raw request: the button says how many
        // questions the test will have, so the link it opens must deliver that
        // many. "All" stays "all" — its whole point is to follow the bank as it
        // grows, which a frozen number would not.
        length: wantsAll ? ALL_QUESTIONS : size || DEFAULT_TEST_LENGTH,
        mode,
      });

  return (
    <div className="space-y-6">
      {presets ? (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Quick start</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <PresetChip
              active={activePreset === null && allSelected}
              onClick={() => {
                setActivePreset(null);
                setSelected(new Set(topics.map((topic) => topic.topic)));
              }}
            >
              All systems
            </PresetChip>
            {presets.weakTopics.length > 0 ? (
              <PresetChip
                active={
                  activePreset === null &&
                  selected.size === presets.weakTopics.length &&
                  presets.weakTopics.every((topic) => selected.has(topic))
                }
                onClick={() => {
                  setActivePreset(null);
                  setSelected(new Set(presets.weakTopics));
                }}
              >
                My weak {presets.weakTopics.length === 1 ? "system" : "systems"}
              </PresetChip>
            ) : null}
            {presets.wrongCount > 0 ? (
              <PresetChip active={activePreset === "wrong"} onClick={() => setActivePreset("wrong")}>
                Questions I got wrong ({formatPresetCount(presets.wrongCount)})
              </PresetChip>
            ) : null}
            {presets.flaggedCount > 0 ? (
              <PresetChip
                active={activePreset === "flagged"}
                onClick={() => setActivePreset("flagged")}
              >
                My flagged questions ({formatPresetCount(presets.flaggedCount)})
              </PresetChip>
            ) : null}
            {presets.unseenCount > 0 ? (
              <PresetChip
                active={activePreset === "unseen"}
                onClick={() => setActivePreset("unseen")}
              >
                Unseen questions ({formatPresetCount(presets.unseenCount)})
              </PresetChip>
            ) : null}
          </div>
        </div>
      ) : null}

      <fieldset disabled={activePreset !== null} className={activePreset ? "opacity-50" : ""}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <legend className="text-sm font-semibold text-foreground">Sections</legend>
          <div className="flex gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                setActivePreset(null);
                setSelected(new Set(topics.map((topic) => topic.topic)));
              }}
              disabled={allSelected}
              className="link-standalone min-w-11 justify-center font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePreset(null);
                setSelected(new Set());
              }}
              disabled={selected.size === 0}
              className="link-standalone min-w-11 justify-center font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
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
          {activePreset === null && available === 0
            ? "Choose at least one section to see how many questions are available."
            : `${available} ${available === 1 ? "question is" : "questions are"} available${
                activePreset ? "" : " in your selection"
              }.`}
        </p>

        {remainingFree !== null ? (
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {remainingFree > 0 ? (
              <>
                {allowanceKind === "preview" ? "Preview" : "Free plan"}: {remainingFree}{" "}
                {remainingFree === 1 ? "question" : "questions"} left on {aircraftCode}.{" "}
              </>
            ) : allowanceKind === "preview" ? (
              <>You&apos;ve used the {aircraftCode} preview. </>
            ) : (
              <>You&apos;ve used your free questions on {aircraftCode}. </>
            )}
            {allowanceKind === "preview" ? (
              <Link href="/signup" className="font-medium text-brand hover:underline">
                Create a free account for more
              </Link>
            ) : (
              <Link href="/upgrade" className="font-medium text-brand hover:underline">
                Subscribe for unlimited
              </Link>
            )}
            .
          </p>
        ) : null}

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
                className={`min-h-11 min-w-11 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-brand text-on-solid"
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
            className={`min-h-11 min-w-11 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              wantsAll
                ? "bg-brand text-on-solid"
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
        ) : shortenedByFreeLimit ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {allowanceKind === "preview"
              ? `The ${aircraftCode} preview covers ${remainingFree} more`
              : `Your free plan allows ${remainingFree} more on ${aircraftCode}`}
            , so the test will have {size}.
          </p>
        ) : shortenedBySection ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Only {available} available in your selection, so the test will have {available}.
          </p>
        ) : null}
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-foreground">How to sit it</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            [
              {
                value: "study" as const,
                title: "Study",
                detail:
                  "The answer and the explanation appear as soon as you answer each question. That question is then settled.",
                clock: "No time limit. The clock on screen just counts how long you have taken.",
              },
              {
                value: "exam" as const,
                title: "Exam",
                detail:
                  "No answers until the end, and you can change your mind on the way through. Closer to sitting the real thing.",
                // A minute a question, so this tracks the test being built
                // rather than being a separate thing to choose. Shown here
                // because it is part of what picking Exam means.
                clock: examMinutes
                  ? `${examMinutes} ${examMinutes === 1 ? "minute" : "minutes"} for ${size} ${
                      size === 1 ? "question" : "questions"
                    } — one minute each. It hands itself in when the time is up.`
                  : "One minute a question. It hands itself in when the time is up.",
              },
            ]
          ).map((option) => {
            const active = mode === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition ${
                  active ? "border-brand bg-brand-soft" : "border-border bg-surface hover:border-brand"
                }`}
              >
                <input
                  type="radio"
                  name="test-mode"
                  value={option.value}
                  checked={active}
                  onChange={() => setMode(option.value)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">{option.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{option.detail}</span>
                  <span className="mt-1.5 block text-sm font-medium text-muted-foreground">
                    {option.clock}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {size > 0 ? (
        <Link
          href={href}
          className="inline-block rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
        >
          Start test · {size} {size === 1 ? "question" : "questions"}
        </Link>
      ) : remainingFree === 0 ? (
        <Link
          href={allowanceKind === "preview" ? "/signup" : "/upgrade"}
          className="inline-block rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
        >
          {allowanceKind === "preview" ? "Sign up to keep going" : "Upgrade to keep going"}
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

/** "500+" once a preset list is long enough that the exact count stops
 * being useful — see `PRESET_COUNT_CEILING`. */
function formatPresetCount(count: number): string {
  return count >= PRESET_COUNT_CEILING ? `${PRESET_COUNT_CEILING}+` : String(count);
}

function PresetChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`tap-target inline-flex items-center rounded-full border px-4 text-sm font-medium transition ${
        active
          ? "border-brand bg-brand-soft text-brand"
          : "border-border bg-surface text-foreground hover:border-brand hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}
