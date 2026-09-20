import type { QuestionOption } from "@/content/schema";
import type { TestResult } from "@/lib/grading";
import type { TestMode } from "@/lib/test-options";

/**
 * Shapes shared between every content kind's test-taking server actions
 * (currently `/aircraft/[code]/test/actions.ts` and
 * `/class/[code]/test/actions.ts`) and the practice-test UI in
 * `src/components/practice-test/`, which is written once and reused by both.
 *
 * The UI never imports a content kind's own actions module directly — it
 * takes six functions as props, typed against these shapes — so it has no
 * idea whether it is running a test for an aircraft or a class rating.
 * Both `actions.ts` files are checked against these types structurally: get
 * one wrong and the page that wires it up fails to typecheck.
 */

/** A question as the browser is allowed to see it: no answer, no explanation.
 * Structurally identical to `TestQuestion` in `db/queries.ts` and its class
 * equivalent in `db/class-queries.ts` — kept as its own type here so the UI
 * depends on neither. */
/** Published question counts per topic — structurally identical to
 * `TopicSummary` in `db/queries.ts` and its class equivalent. */
export type PracticeTopicSummary = {
  topic: string;
  questionCount: number;
};

export type PracticeQuestion = {
  id: string;
  topic: string;
  subtopic: string | null;
  question: string;
  options: QuestionOption[];
  media: string | null;
};

export type AnswerVerdict = {
  isCorrect: boolean;
  correctOptionId: string;
  explanation: string;
  reference: string | null;
};

export type AnswerSaveStatus = "recorded" | "signed-out" | "closed" | "failed";

export type AnswerQuestionInput = {
  /** The content code this test belongs to — an aircraft code or a class
   * rating code. Named after its original, aircraft-only use; nothing here
   * assumes it is one or the other. */
  aircraftCode: string;
  clientTestId: string;
  questionIds: string[];
  questionId: string;
  selectedOptionId: string;
  mode: TestMode;
  topics: string[];
};

export type AnswerQuestionResult =
  | {
      status: "answered";
      verdict: AnswerVerdict | null;
      saved: AnswerSaveStatus;
      startedAt: string | null;
      expiresAt: string | null;
    }
  | { status: "invalid" }
  | { status: "paywall" }
  | { status: "preview-exhausted" }
  | { status: "rate-limited"; retryAfter: string }
  | { status: "failed" };

export type SubmitTestInput = {
  aircraftCode: string;
  clientTestId: string;
  answers: { questionId: string; selectedOptionId: string | null }[];
};

/** How the result was stored, so the screen can say so honestly. */
export type SaveStatus = "saved" | "already-saved" | "signed-out" | "failed";

export type PracticeTestResult = TestResult & {
  saveStatus: SaveStatus;
  /** How many of the reviewed questions had their answer held back, and
   * why — null for a subscriber and for any test inside an allowance. */
  withheld: { count: number; reason: "preview" | "free-tier" } | null;
};

export type ToggleFlagInput = { questionId: string; aircraftCode: string };
export type ToggleFlagResult = { flagged: boolean } | { status: "signed-out" | "failed" };

export type SaveNoteInput = { questionId: string; aircraftCode: string; body: string };
export type SaveNoteResult = { status: "saved" | "signed-out" | "failed" };

/** Mirrors `REASONS` in `components/report-question-button.tsx`. */
export type ReportReason = "wrong_answer" | "unclear" | "typo" | "outdated" | "other";

export type ReportQuestionInput = { questionId: string; reason: ReportReason; comment: string };
export type ReportQuestionResult = { status: "reported" | "failed" };

/** The six server actions the practice-test UI calls, supplied by whichever
 * route is hosting it. */
export type PracticeTestActions = {
  answerQuestion: (input: AnswerQuestionInput) => Promise<AnswerQuestionResult>;
  submitTest: (input: SubmitTestInput) => Promise<PracticeTestResult>;
  toggleFlag: (input: ToggleFlagInput) => Promise<ToggleFlagResult>;
  saveNote: (input: SaveNoteInput) => Promise<SaveNoteResult>;
  loadNote: (questionId: string) => Promise<string>;
  reportQuestion: (input: ReportQuestionInput) => Promise<ReportQuestionResult>;
};
