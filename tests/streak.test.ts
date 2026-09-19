import { describe, expect, it } from "vitest";

import { computeStudyStreak } from "@/lib/streak";

const today = new Date("2026-01-10T18:00:00Z");
function daysAgo(n: number): Date {
  return new Date(today.getTime() - n * 24 * 60 * 60 * 1000);
}

describe("computeStudyStreak", () => {
  it("is zero with no practice at all", () => {
    expect(computeStudyStreak([], today)).toBe(0);
  });

  it("counts today alone as a streak of one", () => {
    expect(computeStudyStreak([daysAgo(0)], today)).toBe(1);
  });

  it("stays alive through yesterday when today has nothing yet", () => {
    expect(computeStudyStreak([daysAgo(1)], today)).toBe(1);
  });

  it("is zero once a full day has been missed", () => {
    expect(computeStudyStreak([daysAgo(2)], today)).toBe(0);
  });

  it("counts an unbroken run ending today", () => {
    expect(computeStudyStreak([daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3)], today)).toBe(4);
  });

  it("stops counting at the first gap", () => {
    // Practised today, yesterday, and three days ago — but not two days ago.
    expect(computeStudyStreak([daysAgo(0), daysAgo(1), daysAgo(3)], today)).toBe(2);
  });

  it("does not care about input order or duplicate days", () => {
    const unordered = [daysAgo(3), daysAgo(0), daysAgo(0), daysAgo(1), daysAgo(2)];
    expect(computeStudyStreak(unordered, today)).toBe(4);
  });

  it("treats same-day timestamps at different times as one day", () => {
    const morning = new Date("2026-01-10T02:00:00Z");
    const evening = new Date("2026-01-10T23:00:00Z");
    expect(computeStudyStreak([morning, evening], today)).toBe(1);
  });
});
