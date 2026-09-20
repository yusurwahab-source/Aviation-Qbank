import { describe, expect, it } from "vitest";

import { gradeTest, withholdAnswerKey, type GradableQuestion } from "@/lib/grading";

/**
 * What a caller who is not entitled to an answer may be told about it.
 *
 * This is the pure half of the rule that stopped the whole bank being
 * readable in one request: `submitTest` graded every question it was handed
 * and returned the key for all of them, to anybody, with no account. The
 * grading still happens over the whole test — the score is the student's own
 * — and this is what decides how much of it leaves the server.
 */

function question(id: string, correct = "b"): GradableQuestion {
  return {
    id,
    topic: "Electrical",
    subtopic: null,
    question: `Question ${id}?`,
    options: ["a", "b", "c", "d"].map((optionId) => ({
      id: optionId,
      text: `Option ${optionId}`,
    })),
    correct,
    explanation: `Because of ${id}.`,
    reference: "FCOM 6.20",
    media: null,
  };
}

const questions = [question("Q1"), question("Q2"), question("Q3")];

/** Answered the first, left the other two blank — the shape a partial
 * entitlement actually arises in. */
const answers = [
  { questionId: "Q1", selectedOptionId: "b" },
  { questionId: "Q2", selectedOptionId: null },
  { questionId: "Q3", selectedOptionId: null },
];

describe("withholdAnswerKey", () => {
  it("returns the result untouched when everything is entitled", () => {
    const result = gradeTest("B737", questions, answers);
    const withheld = withholdAnswerKey(result, new Set(["Q1", "Q2", "Q3"]));

    // The same object, not a copy: the common case must cost nothing.
    expect(withheld).toBe(result);
  });

  it("blanks the key on a question outside the entitlement", () => {
    const result = gradeTest("B737", questions, answers);
    const withheld = withholdAnswerKey(result, new Set(["Q1"]));

    const [first, second, third] = withheld.graded;

    expect(first.withheld).toBeUndefined();
    expect(first.question.correct).toBe("b");
    expect(first.question.explanation).toBe("Because of Q1.");

    for (const entry of [second, third]) {
      expect(entry.withheld).toBe(true);
      // An empty string matches no option at all, rather than pointing at one.
      expect(entry.question.correct).toBe("");
      expect(entry.question.explanation).toBe("");
      expect(entry.question.reference).toBeNull();
      expect(entry.correctOptionText).toBe("");
    }
  });

  it("withholds everything when the entitlement is empty", () => {
    const result = gradeTest("B737", questions, answers);
    const withheld = withholdAnswerKey(result, new Set());

    expect(withheld.graded.every((entry) => entry.withheld)).toBe(true);
    expect(withheld.graded.every((entry) => entry.question.correct === "")).toBe(true);
    expect(withheld.graded.every((entry) => entry.question.explanation === "")).toBe(true);
  });

  it("leaves the score alone — a withheld answer is still a graded question", () => {
    const result = gradeTest("B737", questions, answers);
    const withheld = withholdAnswerKey(result, new Set(["Q1"]));

    // The student left two blank and still sees "1 of 3", not "1 of 1".
    expect(withheld.total).toBe(result.total);
    expect(withheld.correct).toBe(result.correct);
    expect(withheld.incorrect).toBe(result.incorrect);
    expect(withheld.unanswered).toBe(result.unanswered);
    expect(withheld.percentage).toBe(result.percentage);
    expect(withheld.byTopic).toEqual(result.byTopic);
  });

  it("does not mutate the result it was given", () => {
    const result = gradeTest("B737", questions, answers);
    withholdAnswerKey(result, new Set(["Q1"]));

    expect(result.graded[1].question.explanation).toBe("Because of Q2.");
    expect(result.graded[1].withheld).toBeUndefined();
  });

  it("keeps the question readable — only the answer is withheld", () => {
    const result = gradeTest("B737", questions, answers);
    const [, second] = withholdAnswerKey(result, new Set(["Q1"])).graded;

    // The stem and the options were already on screen during the test;
    // withholding them here would say nothing and lose the review's context.
    expect(second.question.question).toBe("Question Q2?");
    expect(second.question.options).toHaveLength(4);
    // And nothing about the answer leaks through the flags either — a
    // withheld entry is always one that was never answered.
    expect(second.wasAnswered).toBe(false);
    expect(second.isCorrect).toBe(false);
  });
});
