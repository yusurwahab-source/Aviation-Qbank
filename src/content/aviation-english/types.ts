/**
 * Aviation English (ICAO ELP) training content types.
 * TODO(backend): these interfaces are the contract a future API should return;
 * today they are served from static data and progress lives in localStorage.
 */

export interface Unit {
  id: string;
  order: number;
  title: string;
  summary: string;
  lessonIds: string[];
}

export interface McqExercise {
  type: "mcq";
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ReadbackExercise {
  type: "readback";
  id: string;
  /** What ATC says. */
  clearance: string;
  /** The model readback the student's answer is compared with. */
  expected: string;
  hint?: string;
}

export type Exercise = McqExercise | ReadbackExercise;

export interface VocabularyItem {
  term: string;
  definition: string;
  example: string;
}

export interface Lesson {
  id: string;
  unitId: string;
  title: string;
  objective: string;
  durationMinutes: number;
  content: string[];
  vocabulary: VocabularyItem[];
  exercises: Exercise[];
  /** Optional listening sample; the file is a placeholder for now. */
  audioUrl?: string;
  audioTranscript?: string;
}

export interface ListeningQuestion {
  id: string;
  /** TODO(backend): replace placeholder files with real recordings. */
  audioUrl: string;
  transcript: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export type SpeakingTaskType = "interview" | "picture" | "roleplay" | "scenario";

export interface SpeakingTask {
  id: string;
  type: SpeakingTaskType;
  title: string;
  prompt: string;
  /** Extra prompt lines (follow-up questions, ATC lines, picture elements). */
  details: string[];
  timeLimitSeconds: number;
}

export type CriterionId =
  | "comprehension"
  | "fluency"
  | "interactions"
  | "vocabulary"
  | "pronunciation"
  | "structure";

export interface Criterion {
  id: CriterionId;
  name: string;
  summary: string;
  descriptors: { 3: string; 4: string; 5: string };
}
