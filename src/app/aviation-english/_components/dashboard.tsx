"use client";

import Link from "next/link";

import { Badge, Card, ScoreBar } from "@/components/ui";
import { LESSONS, getLesson } from "@/content/aviation-english/lessons";
import { RUBRIC } from "@/content/aviation-english/rubric";
import { completedPercent, overallLevel, updateState, useAviationEnglishState } from "@/lib/aviation-english/storage";

const ACTIONS = [
  { href: "/aviation-english/practice?mode=readback", label: "Start Listening Drill", note: "10 min" },
  { href: "/aviation-english/practice?mode=flashcards", label: "Take Quick Quiz", note: "Flashcards" },
  { href: "/aviation-english/lesson/u3-l3", label: "Start Role-play", note: "Approach and landing" },
];

export function Dashboard() {
  const state = useAviationEnglishState();
  const percent = completedPercent(state, LESSONS.length);
  const last = state.lastLessonId ? getLesson(state.lastLessonId) : undefined;
  const next = last && !state.completedLessons.includes(last.id) ? last : LESSONS.find((l) => !state.completedLessons.includes(l.id));
  const recent = state.exams.slice(0, 3);
  const levels = { ...state.selfAssessment, ...(state.exams[0]?.levels ?? {}) };
  const overall = overallLevel(levels, RUBRIC.length);

  return (
    <div className="space-y-6">
      <Card>
        <label className="text-sm text-muted-foreground" htmlFor="ae-name">
          Your name
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground">Welcome, {state.name || "Pilot"}</h2>
          <input
            id="ae-name"
            type="text"
            maxLength={40}
            defaultValue={state.name}
            placeholder="Pilot"
            onBlur={(e) => updateState((s) => ({ ...s, name: e.target.value.trim() }))}
            className="tap-target rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          />
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm text-muted-foreground">
            <span>
              Course progress: {state.completedLessons.length} of {LESSONS.length} lessons
            </span>
            <span>{percent}%</span>
          </div>
          <ScoreBar percentage={percent} />
        </div>
      </Card>

      <section aria-label="ICAO criteria">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">ICAO criteria (last self-assessment)</h2>
          {overall ? <Badge tone={overall >= 4 ? "correct" : "warning"}>Overall level {overall}</Badge> : null}
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {RUBRIC.map((c) => (
            <li key={c.id}>
              <Card padding="p-3">
                <p className="text-xs text-muted-foreground">{c.name}</p>
                <p className="text-xl font-semibold text-foreground">{levels[c.id] ?? "–"}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <Card>
        <h2 className="font-semibold text-foreground">Continue where you left off</h2>
        {next ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">{next.title}</p>
            <Link
              href={`/aviation-english/lesson/${next.id}`}
              className="tap-target mt-3 inline-flex items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid"
            >
              Continue lesson
            </Link>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            {state.completedLessons.length > 0 ? "All lessons complete. Try the mock exam." : "Start with the first lesson."}
          </p>
        )}
      </Card>

      <section aria-label="Quick actions">
        <h2 className="mb-2 font-semibold text-foreground">Quick actions</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {ACTIONS.map((a) => (
            <li key={a.label}>
              <Link href={a.href} className="block">
                <Card className="transition hover:border-brand" padding="p-4">
                  <p className="font-medium text-foreground">{a.label}</p>
                  <p className="text-xs text-muted-foreground">{a.note}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Recent results">
        <h2 className="mb-2 font-semibold text-foreground">Recent results</h2>
        {recent.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">No mock exams yet.</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Listening</th>
                  <th className="px-3 py-2">Report</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-3 py-2">{new Date(e.takenAt).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      {e.listeningCorrect}/{e.listeningTotal}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/aviation-english/results/${e.id}`} className="text-brand-ink underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
