import { describe, expect, it } from "vitest";

import { gradeTest, percentage, type GradableQuestion } from "@/lib/grading";

function question(
  id: string,
  topic: string,
  correct: string,
  optionIds = ["a", "b", "c", "d"],
): GradableQuestion {
  return {
    id,
    topic,
    subtopic: null,
    question: `Question ${id}?`,
    options: optionIds.map((optionId) => ({ id: optionId, text: `Option ${optionId}` })),
    correct,
    explanation: "Because.",
    reference: null,
  };
}

describe("percentage", () => {
  it("rounds to a whole number", () => {
    expect(percentage(1, 3)).toBe(33);
    expect(percentage(2, 3)).toBe(67);
  });

  it("returns 0 rather than dividing by zero", () => {
    expect(percentage(0, 0)).toBe(0);
  });
});

describe("gradeTest", () => {
  const questions = [
    question("DA40-ELEC-0001", "Electrical", "b"),
    question("DA40-ELEC-0002", "Electrical", "a"),
    question("DA40-FUEL-0001", "Fuel", "c"),
  ];

  it("counts correct and incorrect answers", () => {
    const result = gradeTest("DA40", questions, [
      { questionId: "DA40-ELEC-0001", selectedOptionId: "b" },
      { questionId: "DA40-ELEC-0002", selectedOptionId: "d" },
      { questionId: "DA40-FUEL-0001", selectedOptionId: "c" },
    ]);

    expect(result.total).toBe(3);
    expect(result.correct).toBe(2);
    expect(result.incorrect).toBe(1);
    expect(result.percentage).toBe(67);
    expect(result.aircraftCode).toBe("DA40");
  });

  it("treats a missing answer as incorrect but reports it as unanswered", () => {
    const result = gradeTest("DA40", questions, [
      { questionId: "DA40-ELEC-0001", selectedOptionId: "b" },
      { questionId: "DA40-ELEC-0002", selectedOptionId: null },
      { questionId: "DA40-FUEL-0001", selectedOptionId: null },
    ]);

    expect(result.correct).toBe(1);
    expect(result.incorrect).toBe(2);
    expect(result.unanswered).toBe(2);
    expect(result.graded[1].wasAnswered).toBe(false);
    expect(result.graded[1].selectedOptionText).toBeNull();
  });

  it("ignores a selection that is not one of the question's options", () => {
    const result = gradeTest("DA40", [questions[0]], [
      { questionId: "DA40-ELEC-0001", selectedOptionId: "z" },
    ]);

    expect(result.correct).toBe(0);
    expect(result.unanswered).toBe(1);
    expect(result.graded[0].selectedOptionId).toBeNull();
  });

  it("breaks the score down by topic, weakest first", () => {
    const result = gradeTest("DA40", questions, [
      { questionId: "DA40-ELEC-0001", selectedOptionId: "d" },
      { questionId: "DA40-ELEC-0002", selectedOptionId: "d" },
      { questionId: "DA40-FUEL-0001", selectedOptionId: "c" },
    ]);

    expect(result.byTopic).toEqual([
      { topic: "Electrical", correct: 0, total: 2, percentage: 0 },
      { topic: "Fuel", correct: 1, total: 1, percentage: 100 },
    ]);
  });

  it("keeps the order of the questions the user saw", () => {
    const result = gradeTest("DA40", questions, [
      { questionId: "DA40-FUEL-0001", selectedOptionId: "c" },
      { questionId: "DA40-ELEC-0001", selectedOptionId: "b" },
      { questionId: "DA40-ELEC-0002", selectedOptionId: "a" },
    ]);

    expect(result.graded.map((entry) => entry.question.id)).toEqual([
      "DA40-ELEC-0001",
      "DA40-ELEC-0002",
      "DA40-FUEL-0001",
    ]);
    expect(result.percentage).toBe(100);
  });

  it("reports the text of the correct answer for the review screen", () => {
    const result = gradeTest("DA40", [questions[0]], [
      { questionId: "DA40-ELEC-0001", selectedOptionId: "a" },
    ]);

    expect(result.graded[0].correctOptionText).toBe("Option b");
    expect(result.graded[0].selectedOptionText).toBe("Option a");
    expect(result.graded[0].isCorrect).toBe(false);
  });
});
