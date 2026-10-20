"use client";

import { useMemo, useSyncExternalStore } from "react";

import type { CriterionId } from "@/content/aviation-english/types";

/**
 * Progress for the Aviation English module lives in localStorage only.
 * TODO(backend): replace with an API keyed by the signed-in user; keep
 * `AviationEnglishState` as the response shape.
 */
export interface ExamAttempt {
  id: string;
  takenAt: string;
  listeningAnswers: Record<string, number>;
  listeningCorrect: number;
  listeningTotal: number;
  speakingNotes: Record<string, string>;
  /** Self-assessed levels (1-6) per criterion, set on the results page. */
  levels: Partial<Record<CriterionId, number>>;
}

export interface AviationEnglishState {
  name: string;
  completedLessons: string[];
  lastLessonId: string | null;
  selfAssessment: Partial<Record<CriterionId, number>>;
  exams: ExamAttempt[];
  knownCards: string[];
}

const KEY = "pilotqbank.aviation-english.v1";
const EVENT = "aviation-english-change";

export const EMPTY_STATE: AviationEnglishState = {
  name: "",
  completedLessons: [],
  lastLessonId: null,
  selfAssessment: {},
  exams: [],
  knownCards: [],
};

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function parseState(raw: string): AviationEnglishState {
  if (!raw) return EMPTY_STATE;
  try {
    return { ...EMPTY_STATE, ...(JSON.parse(raw) as Partial<AviationEnglishState>) };
  } catch {
    return EMPTY_STATE;
  }
}

/** Reactive view of stored progress. Server render and first paint see the empty state. */
export function useAviationEnglishState(): AviationEnglishState {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  return useMemo(() => parseState(raw), [raw]);
}

export function updateState(change: (s: AviationEnglishState) => AviationEnglishState): void {
  try {
    const next = change(parseState(readRaw()));
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); progress simply is not kept.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function completedPercent(state: AviationEnglishState, totalLessons: number): number {
  if (totalLessons === 0) return 0;
  return Math.round((state.completedLessons.length / totalLessons) * 100);
}

/** ICAO rule: the overall level is the lowest of the criteria. */
export function overallLevel(levels: Partial<Record<CriterionId, number>>, count: number): number | null {
  const values = Object.values(levels).filter((v): v is number => typeof v === "number");
  if (values.length < count) return null;
  return Math.min(...values);
}

/** Listening accuracy mapped to a Comprehension level (indicative only). */
export function comprehensionFromListening(correct: number, total: number): number {
  if (total === 0) return 1;
  const p = correct / total;
  if (p >= 0.95) return 6;
  if (p >= 0.85) return 5;
  if (p >= 0.7) return 4;
  if (p >= 0.5) return 3;
  if (p >= 0.3) return 2;
  return 1;
}
