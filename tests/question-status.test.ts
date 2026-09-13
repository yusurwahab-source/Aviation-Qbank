import { describe, expect, it } from "vitest";

import {
  nextUnansweredIndex,
  questionStatus,
  unansweredCount,
} from "@/lib/question-status";

/**
 * The navigator's logic, tested on its own.
 *
 * The reason it lives in a module rather than inside the component is the
 * first block below: exam mode must not give away which answers were right,
 * and that is a rule worth asserting directly rather than trusting a reader
 * to notice.
 */

describe("questionStatus", () => {
  const answers = { Q1: "a", Q2: "b" };

  it("reports a question nobody has answered", () => {
    expect(questionStatus("Q9", answers, {})).toBe("unanswered");
  });

  describe("in study mode, where verdicts exist", () => {
    const verdicts = { Q1: { isCorrect: true }, Q2: { isCorrect: false } };

    it("says which answers were right and which were not", () => {
      expect(questionStatus("Q1", answers, verdicts)).toBe("correct");
      expect(questionStatus("Q2", answers, verdicts)).toBe("incorrect");
    });

    it("still reports an unanswered question as unanswered", () => {
      expect(questionStatus("Q3", answers, verdicts)).toBe("unanswered");
    });

    it("says only 'answered' while the verdict is still in flight", () => {
      // Answered a moment ago; the server has not replied yet.
      expect(questionStatus("Q1", answers, {})).toBe("answered");
    });
  });

  describe("in exam mode, where there are no verdicts", () => {
    it("never says whether an answer was right", () => {
      // The guarantee exam mode rests on. `verdicts` is empty in exam mode,
      // so there is no branch that could leak it — the information is simply
      // not present to leak.
      for (const id of ["Q1", "Q2"]) {
        const status = questionStatus(id, answers, {});
        expect(status).toBe("answered");
        expect(status).not.toBe("correct");
        expect(status).not.toBe("incorrect");
      }
    });
  });
});

describe("unansweredCount", () => {
  it("counts what is still outstanding", () => {
    expect(unansweredCount(["Q1", "Q2", "Q3"], { Q1: "a" })).toBe(2);
    expect(unansweredCount(["Q1", "Q2"], { Q1: "a", Q2: "b" })).toBe(0);
    expect(unansweredCount([], {})).toBe(0);
  });
});

describe("nextUnansweredIndex", () => {
  const ids = ["Q1", "Q2", "Q3", "Q4"];

  it("finds the next gap after where you are", () => {
    expect(nextUnansweredIndex(ids, { Q1: "a", Q2: "a" }, 0)).toBe(2);
  });

  it("wraps around to the ones left behind", () => {
    // Standing on the last question with an early one skipped is exactly when
    // this is worth having.
    expect(nextUnansweredIndex(ids, { Q1: "a", Q3: "a", Q4: "a" }, 3)).toBe(1);
  });

  it("returns null once everything is answered", () => {
    const all = { Q1: "a", Q2: "a", Q3: "a", Q4: "a" };
    expect(nextUnansweredIndex(ids, all, 0)).toBeNull();
  });

  it("does not offer the question already on screen", () => {
    // Sitting on an unanswered question, "next" means a different one.
    expect(nextUnansweredIndex(ids, { Q2: "a", Q3: "a", Q4: "a" }, 0)).toBeNull();
  });
});
