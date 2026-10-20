"use client";

import Link from "next/link";

import { Badge, Card, EmptyState } from "@/components/ui";
import { OPERATIONAL_LEVEL, RUBRIC } from "@/content/aviation-english/rubric";
import type { CriterionId } from "@/content/aviation-english/types";
import {
  comprehensionFromListening,
  overallLevel,
  updateState,
  useAviationEnglishState,
} from "@/lib/aviation-english/storage";

const LEVELS = [1, 2, 3, 4, 5, 6];

export function ResultsReport({ examId }: { examId: string }) {
  const state = useAviationEnglishState();
  const exam = state.exams.find((e) => e.id === examId);

  if (!exam) {
    return (
      <EmptyState title="Result not found">
        Results are stored on the device that took the exam.{" "}
        <Link href="/aviation-english/exam" className="underline">
          Take the mock exam
        </Link>
        .
      </EmptyState>
    );
  }

  // Comprehension is derived from the listening score; the rest are self-assessed.
  const levels: Partial<Record<CriterionId, number>> = {
    ...exam.levels,
    comprehension: comprehensionFromListening(exam.listeningCorrect, exam.listeningTotal),
  };
  const overall = overallLevel(levels, RUBRIC.length);

  function setLevel(id: CriterionId, level: number) {
    updateState((s) => ({
      ...s,
      selfAssessment: { ...s.selfAssessment, [id]: level },
      exams: s.exams.map((e) => (e.id === examId ? { ...e, levels: { ...e.levels, [id]: level } } : e)),
    }));
  }

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-sm text-muted-foreground">Listening score</p>
        <p className="text-3xl font-semibold text-foreground">
          {exam.listeningCorrect} / {exam.listeningTotal}
        </p>
        <div className="mt-3">
          {overall === null ? (
            <Badge tone="neutral">Rate the five speaking criteria below to get your overall level</Badge>
          ) : (
            <Badge tone={overall >= OPERATIONAL_LEVEL ? "correct" : "warning"}>
              Overall level {overall} · {overall >= OPERATIONAL_LEVEL ? "Operational level reached" : "Below Operational Level 4"}
            </Badge>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Indicative only: this is a practice report, not an official assessment. The overall level is the lowest criterion. Comprehension
          comes from your listening score; rate the other criteria honestly against the descriptors.
          {/* TODO(backend): replace self-assessment with instructor scoring. */}
        </p>
      </Card>

      <ul className="space-y-3">
        {RUBRIC.map((c) => {
          const level = levels[c.id];
          const auto = c.id === "comprehension";
          return (
            <li key={c.id}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-foreground">{c.name}</h2>
                  {auto ? (
                    <Badge tone="brand">Level {level} (from listening)</Badge>
                  ) : (
                    <select
                      aria-label={`${c.name} level`}
                      value={level ?? ""}
                      onChange={(e) => setLevel(c.id, Number(e.target.value))}
                      className="tap-target rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                    >
                      <option value="" disabled>
                        Rate yourself
                      </option>
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>
                          Level {l}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.summary}</p>
                <dl className="mt-3 space-y-1 text-sm">
                  {([3, 4, 5] as const).map((l) => (
                    <div key={l} className={level === l ? "font-medium text-foreground" : "text-muted-foreground"}>
                      <dt className="inline">Level {l}: </dt>
                      <dd className="inline">{c.descriptors[l]}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </li>
          );
        })}
      </ul>

      <Link href="/aviation-english" className="link-standalone inline-block text-sm text-brand-ink underline">
        Back to dashboard
      </Link>
    </div>
  );
}
