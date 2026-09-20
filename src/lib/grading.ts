import type { QuestionOption } from "@/content/schema";

/**
 * Test grading.
 *
 * Deliberately a plain function over plain data, with no database and no React
 * in sight, so it can be unit tested and so Phase 3 can reuse it unchanged when
 * attempts start being written to the database.
 */

export type GradableQuestion = {
  id: string;
  topic: string;
  subtopic: string | null;
  question: string;
  options: QuestionOption[];
  correct: string;
  explanation: string;
  reference: string | null;
  media: string | null;
};

/** What the user chose. `null` means the question was left unanswered. */
export type SubmittedAnswer = {
  questionId: string;
  selectedOptionId: string | null;
};

export type GradedQuestion = {
  question: GradableQuestion;
  selectedOptionId: string | null;
  selectedOptionText: string | null;
  correctOptionText: string;
  isCorrect: boolean;
  wasAnswered: boolean;
  /**
   * True when the caller is not entitled to this question's answer, so the
   * key has been stripped out of this entry before it left the server. See
   * `withholdAnswerKey` below. Absent means "not withheld", which is what
   * every entry `gradeTest` itself produces is.
   */
  withheld?: boolean;
};

export type TopicScore = {
  topic: string;
  correct: number;
  total: number;
  /** Whole-number percentage, 0-100. */
  percentage: number;
};

export type TestResult = {
  aircraftCode: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  /** Whole-number percentage of the whole test, 0-100. */
  percentage: number;
  byTopic: TopicScore[];
  graded: GradedQuestion[];
};

export function percentage(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Grades a set of answers against the answer key.
 *
 * The question order of `questions` is preserved in the result. Answers for
 * questions that are not in the key are ignored, and questions with no answer
 * count as incorrect — unanswered is reported separately so the user can tell
 * "I got it wrong" from "I ran out of time".
 */
export function gradeTest(
  aircraftCode: string,
  questions: GradableQuestion[],
  answers: SubmittedAnswer[],
): TestResult {
  const selectionByQuestion = new Map<string, string | null>();
  for (const answer of answers) {
    selectionByQuestion.set(answer.questionId, answer.selectedOptionId);
  }

  const graded: GradedQuestion[] = questions.map((question) => {
    const rawSelection = selectionByQuestion.get(question.id) ?? null;
    // Ignore a selection that is not one of this question's options.
    const selectedOption = question.options.find((option) => option.id === rawSelection) ?? null;
    const correctOption = question.options.find((option) => option.id === question.correct);

    return {
      question,
      selectedOptionId: selectedOption?.id ?? null,
      selectedOptionText: selectedOption?.text ?? null,
      correctOptionText: correctOption?.text ?? question.correct,
      isCorrect: selectedOption !== null && selectedOption.id === question.correct,
      wasAnswered: selectedOption !== null,
    };
  });

  const correct = graded.filter((entry) => entry.isCorrect).length;
  const unanswered = graded.filter((entry) => !entry.wasAnswered).length;

  const topicTotals = new Map<string, { correct: number; total: number }>();
  for (const entry of graded) {
    const totals = topicTotals.get(entry.question.topic) ?? { correct: 0, total: 0 };
    totals.total += 1;
    if (entry.isCorrect) totals.correct += 1;
    topicTotals.set(entry.question.topic, totals);
  }

  const byTopic: TopicScore[] = [...topicTotals.entries()]
    .map(([topic, totals]) => ({
      topic,
      correct: totals.correct,
      total: totals.total,
      percentage: percentage(totals.correct, totals.total),
    }))
    // Weakest topic first: that is the one the user should work on.
    .sort((a, b) => a.percentage - b.percentage || a.topic.localeCompare(b.topic));

  return {
    aircraftCode,
    total: graded.length,
    correct,
    incorrect: graded.length - correct,
    unanswered,
    percentage: percentage(correct, graded.length),
    byTopic,
    graded,
  };
}


/**
 * Strips the answer key out of the questions the caller has not earned.
 *
 * The result screen exists to show a student what they got wrong and why,
 * which means `gradeTest` returns the correct option and the explanation for
 * every question it grades. That is right for the student who sat the test
 * and wrong for anyone who merely *submitted* a list of question ids — and
 * for a while it was the larger of two ways to read this bank without an
 * account: one request naming every published question came back with every
 * answer and every explanation in it.
 *
 * So the grading stays exactly as it was — the totals, the per-topic
 * breakdown and the score are computed over the whole test, because those
 * are the student's own results and no part of them is a secret — and this
 * runs afterwards to blank the key on anything outside `entitledIds`.
 * Scoring over the full set and redacting after is deliberate: a student who
 * left two questions blank still sees "18 of 20", not "18 of 18".
 *
 * `isCorrect` and `wasAnswered` survive on purpose. A withheld entry is
 * always one the caller never answered — anything they answered was paid for
 * at the time — so both are already false, and nothing about the answer can
 * be inferred from them.
 *
 * Pure, and separate from `gradeTest`, so "what may this caller see" can be
 * asserted directly rather than inferred from a database test.
 */
export function withholdAnswerKey(result: TestResult, entitledIds: Set<string>): TestResult {
  let withheldCount = 0;

  const graded = result.graded.map((entry) => {
    if (entitledIds.has(entry.question.id)) return entry;
    withheldCount += 1;

    return {
      ...entry,
      question: {
        ...entry.question,
        // The three fields that are the key. `correct` names the right
        // option, so an empty string here matches no option at all rather
        // than pointing at one.
        correct: "",
        explanation: "",
        reference: null,
      },
      correctOptionText: "",
      withheld: true,
    };
  });

  // Nothing was withheld: hand back the original object rather than a copy,
  // so the common case — a subscriber, or any student inside their
  // allowance — costs nothing at all.
  if (withheldCount === 0) return result;

  return { ...result, graded };
}
