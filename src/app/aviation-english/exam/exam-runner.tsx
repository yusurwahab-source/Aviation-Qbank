"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui";
import { LISTENING_AUDIO_NOTE, LISTENING_QUESTIONS, SPEAKING_TASKS } from "@/content/aviation-english/mockExam";
import { updateState } from "@/lib/aviation-english/storage";

import { AudioPlayer } from "../_components/audio-player";

type Phase = "intro" | "listening" | "speaking";

function SpeakingTimer({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          window.clearInterval(id);
          setRunning(false);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, "0");
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl font-semibold tabular-nums text-foreground" aria-live="off">
        {m}:{s}
      </span>
      <button
        type="button"
        onClick={() => setRunning((r) => !r)}
        disabled={left === 0}
        className="tap-target rounded-lg border border-border px-4 text-sm disabled:opacity-40"
      >
        {running ? "Pause" : left === seconds ? "Start timer" : "Resume"}
      </button>
    </div>
  );
}

export function ExamRunner() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [tIndex, setTIndex] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});

  function finish() {
    const correct = LISTENING_QUESTIONS.filter((q) => answers[q.id] === q.correctIndex).length;
    const id = `exam-${Date.now().toString(36)}`;
    updateState((s) => ({
      ...s,
      exams: [
        {
          id,
          takenAt: new Date().toISOString(),
          listeningAnswers: answers,
          listeningCorrect: correct,
          listeningTotal: LISTENING_QUESTIONS.length,
          speakingNotes: notes,
          levels: {},
        },
        ...s.exams,
      ],
    }));
    router.push(`/aviation-english/results/${id}`);
  }

  if (phase === "intro") {
    return (
      <Card className="space-y-3">
        <h2 className="font-semibold text-foreground">Before you start</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Part 1, Listening: 20 multiple-choice questions, one recording each.</li>
          <li>Part 2, Speaking: interview, picture description, ATC role-play and scenario analysis, each timed.</li>
          <li>Speak your answers aloud; you may type notes. Nothing is recorded or uploaded.</li>
          <li>Your overall ICAO level is the lowest of the six criteria.</li>
        </ul>
        <p className="rounded-lg bg-warning-soft p-3 text-sm text-warning">{LISTENING_AUDIO_NOTE}</p>
        <button
          type="button"
          onClick={() => setPhase("listening")}
          className="tap-target rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid"
        >
          Start listening
        </button>
      </Card>
    );
  }

  if (phase === "listening") {
    const q = LISTENING_QUESTIONS[qIndex];
    const last = qIndex === LISTENING_QUESTIONS.length - 1;
    return (
      <Card className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Listening · question {qIndex + 1} of {LISTENING_QUESTIONS.length}
        </p>
        <AudioPlayer key={q.id} src={q.audioUrl} transcript={q.transcript} />
        <p className="question-text font-medium text-foreground">{q.prompt}</p>
        <div className="space-y-2">
          {q.options.map((o, i) => (
            <label
              key={i}
              className={`tap-target flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                answers[q.id] === i ? "border-brand bg-brand-soft" : "border-border"
              }`}
            >
              <input type="radio" name={q.id} checked={answers[q.id] === i} onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))} />
              {o}
            </label>
          ))}
        </div>
        <div className="flex justify-between">
          <button
            type="button"
            disabled={qIndex === 0}
            onClick={() => setQIndex((i) => i - 1)}
            className="tap-target rounded-lg border border-border px-4 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => (last ? setPhase("speaking") : setQIndex((i) => i + 1))}
            className="tap-target rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid"
          >
            {last ? "Go to speaking" : "Next"}
          </button>
        </div>
      </Card>
    );
  }

  const task = SPEAKING_TASKS[tIndex];
  const last = tIndex === SPEAKING_TASKS.length - 1;
  return (
    <Card className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Speaking · task {tIndex + 1} of {SPEAKING_TASKS.length}
      </p>
      <h2 className="text-lg font-semibold text-foreground">{task.title}</h2>
      <p className="question-text text-foreground">{task.prompt}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {task.details.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
      <SpeakingTimer key={task.id} seconds={task.timeLimitSeconds} />
      <textarea
        value={notes[task.id] ?? ""}
        onChange={(e) => setNotes((n) => ({ ...n, [task.id]: e.target.value }))}
        aria-label="Optional notes"
        rows={3}
        placeholder="Optional notes"
        className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground"
      />
      <div className="flex justify-between">
        <button
          type="button"
          disabled={tIndex === 0}
          onClick={() => setTIndex((i) => i - 1)}
          className="tap-target rounded-lg border border-border px-4 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => (last ? finish() : setTIndex((i) => i + 1))}
          className="tap-target rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid"
        >
          {last ? "Finish and see results" : "Next task"}
        </button>
      </div>
    </Card>
  );
}
