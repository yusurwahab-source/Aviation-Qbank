"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Card } from "@/components/ui";
import { LESSONS } from "@/content/aviation-english/lessons";
import { updateState, useAviationEnglishState } from "@/lib/aviation-english/storage";

import { READBACK_PASS, readbackScore } from "../_components/readback";

const CARDS = LESSONS.flatMap((l) => l.vocabulary.map((v) => ({ id: `${l.id}:${v.term}`, ...v })));
const DRILLS = LESSONS.flatMap((l) => l.exercises.flatMap((e) => (e.type === "readback" ? [e] : [])));

function Flashcards() {
  const state = useAviationEnglishState();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = CARDS[index];
  const known = state.knownCards.includes(card.id);

  function go(delta: number) {
    setFlipped(false);
    setIndex((i) => (i + delta + CARDS.length) % CARDS.length);
  }

  return (
    <Card>
      <p className="text-xs text-muted-foreground">
        Card {index + 1} of {CARDS.length} · {state.knownCards.length} known
      </p>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="tap-target mt-3 block min-h-32 w-full rounded-lg border border-border bg-surface-muted p-4 text-left"
        aria-label="Flip card"
      >
        {flipped ? (
          <>
            <span className="block text-sm text-foreground">{card.definition}</span>
            <span className="mt-2 block text-sm italic text-muted-foreground">&ldquo;{card.example}&rdquo;</span>
          </>
        ) : (
          <span className="text-xl font-semibold text-foreground">{card.term}</span>
        )}
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => go(-1)} className="tap-target rounded-lg border border-border px-4 text-sm">
          Previous
        </button>
        <button
          type="button"
          onClick={() =>
            updateState((s) => ({
              ...s,
              knownCards: known ? s.knownCards.filter((k) => k !== card.id) : [...s.knownCards, card.id],
            }))
          }
          className="tap-target rounded-lg border border-border px-4 text-sm"
        >
          {known ? "Unmark known" : "I know this"}
        </button>
        <button type="button" onClick={() => go(1)} className="tap-target rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid">
          Next
        </button>
      </div>
    </Card>
  );
}

function Readbacks() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const drill = DRILLS[index];
  const ok = readbackScore(answer, drill.expected) >= READBACK_PASS;

  return (
    <Card>
      <p className="text-xs text-muted-foreground">
        Drill {index + 1} of {DRILLS.length}
      </p>
      <p className="question-text mt-2 font-medium text-foreground">ATC: &ldquo;{drill.clearance}&rdquo;</p>
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        aria-label="Your readback"
        className="tap-target mt-3 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
      />
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setChecked(true)} className="tap-target rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid">
          Check
        </button>
        <button
          type="button"
          onClick={() => {
            setIndex((i) => (i + 1) % DRILLS.length);
            setAnswer("");
            setChecked(false);
          }}
          className="tap-target rounded-lg border border-border px-4 text-sm"
        >
          Next drill
        </button>
      </div>
      {checked ? (
        <p className={`mt-3 text-sm ${ok ? "text-correct" : "text-incorrect"}`}>
          {ok ? "Good readback. " : "Not quite. "}Model answer: {drill.expected}
        </p>
      ) : null}
    </Card>
  );
}

function Hub() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"flashcards" | "readback">(params.get("mode") === "readback" ? "readback" : "flashcards");
  return (
    <div className="space-y-4">
      <div role="tablist" className="flex gap-2">
        {(["flashcards", "readback"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            type="button"
            onClick={() => setMode(m)}
            className={`tap-target rounded-lg px-4 text-sm font-medium ${mode === m ? "bg-brand text-on-solid" : "border border-border text-foreground"}`}
          >
            {m === "flashcards" ? "Flashcards" : "Read-back drills"}
          </button>
        ))}
      </div>
      {mode === "flashcards" ? <Flashcards /> : <Readbacks />}
    </div>
  );
}

export function PracticeHub() {
  return (
    <Suspense fallback={null}>
      <Hub />
    </Suspense>
  );
}
