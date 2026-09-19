import { describe, expect, it } from "vitest";

import { SMART_TEST_WEIGHTS } from "@/lib/smart-test-config";
import {
  baseWeightFor,
  isRecentlyCorrect,
  selectSmartTestQuestions,
  weightFor,
  type QuestionSignal,
} from "@/lib/smart-test";

function signal(overrides: Partial<QuestionSignal> = {}): QuestionSignal {
  return {
    questionId: "Q-0001",
    neverSeen: true,
    lastCorrect: null,
    correctStreak: 0,
    lastAnsweredAt: null,
    flagged: false,
    ...overrides,
  };
}

describe("baseWeightFor", () => {
  it("weights a never-seen question at neverSeen", () => {
    expect(baseWeightFor(signal({ neverSeen: true }))).toBe(SMART_TEST_WEIGHTS.neverSeen);
  });

  it("weights a question wrong last time at wrongLastAttempt, regardless of streak", () => {
    expect(
      baseWeightFor({ neverSeen: false, lastCorrect: false, correctStreak: 0 }),
    ).toBe(SMART_TEST_WEIGHTS.wrongLastAttempt);
  });

  it("weights a single correct answer at rightOnce", () => {
    expect(
      baseWeightFor({ neverSeen: false, lastCorrect: true, correctStreak: 1 }),
    ).toBe(SMART_TEST_WEIGHTS.rightOnce);
  });

  it("weights two or more correct in a row at rightStreak", () => {
    expect(
      baseWeightFor({ neverSeen: false, lastCorrect: true, correctStreak: 2 }),
    ).toBe(SMART_TEST_WEIGHTS.rightStreak);
    expect(
      baseWeightFor({ neverSeen: false, lastCorrect: true, correctStreak: 5 }),
    ).toBe(SMART_TEST_WEIGHTS.rightStreak);
  });
});

describe("weightFor", () => {
  it("adds the flagged bonus on top of the base weight", () => {
    const base = signal({ neverSeen: false, lastCorrect: true, correctStreak: 2 });
    expect(weightFor(base)).toBe(SMART_TEST_WEIGHTS.rightStreak);
    expect(weightFor({ ...base, flagged: true })).toBe(
      SMART_TEST_WEIGHTS.rightStreak + SMART_TEST_WEIGHTS.flaggedBonus,
    );
  });

  it("never returns zero or negative, even with a hostile config", () => {
    const weight = weightFor(signal({ neverSeen: false, lastCorrect: true, correctStreak: 2 }), {
      neverSeen: 0,
      wrongLastAttempt: 0,
      rightOnce: 0,
      rightStreak: 0,
      flaggedBonus: 0,
    });
    expect(weight).toBeGreaterThan(0);
  });
});

describe("isRecentlyCorrect", () => {
  const now = new Date("2026-01-02T12:00:00Z");

  it("is false for a question never seen", () => {
    expect(isRecentlyCorrect({ lastCorrect: null, lastAnsweredAt: null }, now)).toBe(false);
  });

  it("is false for a question wrong last time, however recent", () => {
    expect(
      isRecentlyCorrect({ lastCorrect: false, lastAnsweredAt: now }, now),
    ).toBe(false);
  });

  it("is true for a question answered correctly a few hours ago", () => {
    const answeredAt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    expect(isRecentlyCorrect({ lastCorrect: true, lastAnsweredAt: answeredAt }, now)).toBe(true);
  });

  it("is false once the spacing window has passed", () => {
    const answeredAt = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    expect(isRecentlyCorrect({ lastCorrect: true, lastAnsweredAt: answeredAt }, now)).toBe(false);
  });

  it("respects a custom spacing window", () => {
    const answeredAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(isRecentlyCorrect({ lastCorrect: true, lastAnsweredAt: answeredAt }, now, 1)).toBe(
      false,
    );
  });
});

describe("selectSmartTestQuestions", () => {
  it("returns nothing for a non-positive count or an empty pool", () => {
    expect(selectSmartTestQuestions([signal()], 0)).toEqual([]);
    expect(selectSmartTestQuestions([], 5)).toEqual([]);
  });

  it("never returns more than the pool holds", () => {
    const signals = [signal({ questionId: "A" }), signal({ questionId: "B" })];
    expect(selectSmartTestQuestions(signals, 10)).toHaveLength(2);
  });

  it("never repeats a question within one draw", () => {
    const signals = Array.from({ length: 20 }, (_, i) => signal({ questionId: `Q-${i}` }));
    const result = selectSmartTestQuestions(signals, 8);
    expect(new Set(result).size).toBe(result.length);
    expect(result).toHaveLength(8);
  });

  it("excludes a recently-correct question when the pool can spare it", () => {
    const now = new Date("2026-01-02T12:00:00Z");
    const recent = signal({
      questionId: "recent",
      neverSeen: false,
      lastCorrect: true,
      lastAnsweredAt: new Date(now.getTime() - 60 * 60 * 1000),
    });
    const others = Array.from({ length: 5 }, (_, i) => signal({ questionId: `other-${i}` }));
    const result = selectSmartTestQuestions([recent, ...others], 3, { now });
    expect(result).not.toContain("recent");
  });

  it("falls back to the full pool once excluding recent questions would leave too few", () => {
    const now = new Date("2026-01-02T12:00:00Z");
    const recent = signal({
      questionId: "recent",
      neverSeen: false,
      lastCorrect: true,
      lastAnsweredAt: new Date(now.getTime() - 60 * 60 * 1000),
    });
    const other = signal({ questionId: "other" });
    // Only one non-recent candidate exists, but two questions are needed —
    // the spacing rule must stand down rather than hand back a short test.
    const result = selectSmartTestQuestions([recent, other], 2, { now });
    expect(result).toHaveLength(2);
    expect(result).toContain("recent");
  });

  it("draws a heavier-weighted question more often than a lighter one", () => {
    const heavy = signal({ questionId: "heavy", neverSeen: false, lastCorrect: false }); // weight 5
    const light = signal({
      questionId: "light",
      neverSeen: false,
      lastCorrect: true,
      correctStreak: 2,
    }); // weight 0.25

    let heavyWins = 0;
    const trials = 500;
    for (let i = 0; i < trials; i++) {
      // A fresh pseudo-random sequence per trial, seeded by the loop index,
      // so this is deterministic across runs while still exercising many
      // draws of the u ** (1/weight) key.
      let seed = i + 1;
      const random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
      const [first] = selectSmartTestQuestions([heavy, light], 1, { random });
      if (first === "heavy") heavyWins++;
    }

    // With weight 5 versus 0.25, "heavy" should win the great majority of
    // single-question draws — comfortably more than half is enough to prove
    // the bias without pinning an exact ratio to one PRNG's behaviour.
    expect(heavyWins).toBeGreaterThan(trials * 0.7);
  });

  it("gives a flagged question a real edge over the same question unflagged", () => {
    const plain = signal({ questionId: "plain", neverSeen: false, lastCorrect: true, correctStreak: 2 });
    const flagged = signal({ ...plain, questionId: "flagged", flagged: true });

    let flaggedWins = 0;
    const trials = 500;
    for (let i = 0; i < trials; i++) {
      let seed = i + 1;
      const random = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
      const [first] = selectSmartTestQuestions([plain, flagged], 1, { random });
      if (first === "flagged") flaggedWins++;
    }

    expect(flaggedWins).toBeGreaterThan(trials * 0.7);
  });
});
