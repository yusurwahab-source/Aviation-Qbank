import { describe, expect, it } from "vitest";

import { communityPercentCorrect, MIN_FIRST_ATTEMPTS_TO_SHOW } from "@/lib/community-stats";

describe("communityPercentCorrect", () => {
  it("is null with no stat at all", () => {
    expect(communityPercentCorrect(null)).toBeNull();
    expect(communityPercentCorrect(undefined)).toBeNull();
  });

  it("is null below the threshold", () => {
    expect(
      communityPercentCorrect({
        firstAttempts: MIN_FIRST_ATTEMPTS_TO_SHOW - 1,
        firstAttemptsCorrect: MIN_FIRST_ATTEMPTS_TO_SHOW - 1,
      }),
    ).toBeNull();
  });

  it("shows a rounded percentage once the threshold is met", () => {
    expect(
      communityPercentCorrect({
        firstAttempts: MIN_FIRST_ATTEMPTS_TO_SHOW,
        firstAttemptsCorrect: 13,
      }),
    ).toBe(65);
  });

  it("rounds to the nearest whole percent", () => {
    expect(communityPercentCorrect({ firstAttempts: 20, firstAttemptsCorrect: 15 })).toBe(75);
    expect(communityPercentCorrect({ firstAttempts: 30, firstAttemptsCorrect: 10 })).toBe(33);
  });
});
