"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge, Card } from "@/components/ui";
import type { Lesson } from "@/content/aviation-english/types";
import { updateState, useAviationEnglishState } from "@/lib/aviation-english/storage";

import { AudioPlayer } from "../../_components/audio-player";
import { READBACK_PASS, readbackScore } from "../../_components/readback";

const STEPS = ["Objective", "Content", "Vocabulary", "Exercise", "Self-check"] as const;

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const state = useAviationEnglishState();
  const [step, setStep] = useState(0);
  const [mcq, setMcq] = useState<Record<string, number>>({});
  const [readbacks, setReadbacks] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [confident, setConfident] = useState(false);

  useEffect(() => {
    updateState((s) => ({ ...s, lastLessonId: lesson.id }));
  }, [lesson.id]);

  const done = state.completedLessons.includes(lesson.id);
  const percent = Math.round(((step + (done ? 1 : 0)) / STEPS.length) * 100);

  function complete() {
    updateState((s) => ({
      ...s,
      completedLessons: s.completedLessons.includes(lesson.id) ? s.completedLessons : [...s.completedLessons, lesson.id],
    }));
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 mb-6 border-b border-border bg-background px-1 py-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {STEPS[step]} · step {step + 1} of {STEPS.length}
          </span>
          <span>{percent}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2 overflow-hidden rounded-full bg-surface-muted"
        >
          <div className="h-full bg-brand" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-foreground">{lesson.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{lesson.durationMinutes} min</p>

      <Card className="mt-6">
        {step === 0 ? (
          <section>
            <h2 className="mb-2 font-semibold text-foreground">Objective</h2>
            <p className="question-text text-foreground">{lesson.objective}</p>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="space-y-3">
            <h2 className="font-semibold text-foreground">Content</h2>
            {lesson.content.map((p, i) => (
              <p key={i} className="question-text text-foreground">
                {p}
              </p>
            ))}
            {lesson.audioUrl ? <AudioPlayer src={lesson.audioUrl} transcript={lesson.audioTranscript} /> : null}
          </section>
        ) : null}

        {step === 2 ? (
          <section>
            <h2 className="mb-3 font-semibold text-foreground">Vocabulary</h2>
            <dl className="space-y-3">
              {lesson.vocabulary.map((v) => (
                <div key={v.term}>
                  <dt className="font-medium text-foreground">{v.term}</dt>
                  <dd className="text-sm text-muted-foreground">{v.definition}</dd>
                  <dd className="text-sm italic text-muted-foreground">&ldquo;{v.example}&rdquo;</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-6">
            <h2 className="font-semibold text-foreground">Exercise</h2>
            {lesson.exercises.map((ex) =>
              ex.type === "mcq" ? (
                <div key={ex.id}>
                  <p className="question-text mb-2 text-foreground">{ex.prompt}</p>
                  <div className="space-y-2">
                    {ex.options.map((o, i) => {
                      const picked = mcq[ex.id];
                      const revealed = picked !== undefined;
                      const tone = !revealed
                        ? "border-border"
                        : i === ex.correctIndex
                          ? "border-correct bg-correct-soft"
                          : i === picked
                            ? "border-incorrect bg-incorrect-soft"
                            : "border-border";
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={revealed}
                          onClick={() => setMcq((m) => ({ ...m, [ex.id]: i }))}
                          className={`tap-target block w-full rounded-lg border px-3 py-2 text-left text-sm ${tone}`}
                        >
                          {o}
                        </button>
                      );
                    })}
                  </div>
                  {mcq[ex.id] !== undefined ? (
                    <p className="mt-2 text-sm text-muted-foreground">{ex.explanation}</p>
                  ) : null}
                </div>
              ) : (
                <div key={ex.id}>
                  <p className="mb-1 text-sm text-muted-foreground">Read back this transmission:</p>
                  <p className="question-text mb-2 font-medium text-foreground">ATC: &ldquo;{ex.clearance}&rdquo;</p>
                  <input
                    type="text"
                    value={readbacks[ex.id] ?? ""}
                    onChange={(e) => setReadbacks((r) => ({ ...r, [ex.id]: e.target.value }))}
                    aria-label="Your readback"
                    className="tap-target w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setChecked((c) => ({ ...c, [ex.id]: true }))}
                    className="tap-target mt-2 rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid"
                  >
                    Check readback
                  </button>
                  {checked[ex.id] ? (
                    readbackScore(readbacks[ex.id] ?? "", ex.expected) >= READBACK_PASS ? (
                      <p className="mt-2 text-sm text-correct">Good readback. Model answer: {ex.expected}</p>
                    ) : (
                      <p className="mt-2 text-sm text-incorrect">
                        Not quite. Model answer: {ex.expected}
                        {ex.hint ? ` (${ex.hint})` : ""}
                      </p>
                    )
                  ) : null}
                </div>
              ),
            )}
          </section>
        ) : null}

        {step === 4 ? (
          <section className="space-y-3">
            <h2 className="font-semibold text-foreground">Self-check</h2>
            <p className="question-text text-foreground">Could you meet this objective without notes?</p>
            <p className="text-sm text-muted-foreground">{lesson.objective}</p>
            <label className="tap-target flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={confident} onChange={(e) => setConfident(e.target.checked)} />
              Yes, I can do this.
            </label>
            {done ? (
              <Badge tone="correct">Lesson completed</Badge>
            ) : (
              <button
                type="button"
                onClick={complete}
                className="tap-target rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid"
              >
                {confident ? "Mark lesson complete" : "Mark complete (I will review again)"}
              </button>
            )}
          </section>
        ) : null}
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
          className="tap-target rounded-lg border border-border px-4 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="tap-target rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid"
          >
            Next
          </button>
        ) : (
          <Link
            href={`/aviation-english/course/${lesson.unitId}`}
            className="tap-target inline-flex items-center rounded-lg border border-border px-4 text-sm"
          >
            Back to unit
          </Link>
        )}
      </div>
    </div>
  );
}
