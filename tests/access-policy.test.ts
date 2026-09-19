import { describe, expect, it } from "vitest";

import {
  FREE_QUESTIONS_PER_AIRCRAFT,
  canAnswerQuestion,
  daysRemaining,
  hasActiveSubscription,
  mapStripeSubscriptionStatus,
  remainingFreeQuestions,
} from "@/lib/billing/access-policy";

describe("hasActiveSubscription", () => {
  it("is false with no subscription at all", () => {
    expect(hasActiveSubscription(null)).toBe(false);
  });

  it("is false for anything other than 'active'", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60);
    expect(hasActiveSubscription({ status: "canceled", currentPeriodEnd: future })).toBe(false);
    expect(hasActiveSubscription({ status: "expired", currentPeriodEnd: future })).toBe(false);
  });

  it("is false once the current period has ended, even if status still reads active", () => {
    const past = new Date(Date.now() - 1000);
    expect(hasActiveSubscription({ status: "active", currentPeriodEnd: past })).toBe(false);
  });

  it("is false for an active row with no confirmed period yet", () => {
    expect(hasActiveSubscription({ status: "active", currentPeriodEnd: null })).toBe(false);
  });

  it("is true for an active subscription within its period", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60);
    expect(hasActiveSubscription({ status: "active", currentPeriodEnd: future })).toBe(true);
  });
});

describe("remainingFreeQuestions", () => {
  it("counts down from the free allowance", () => {
    expect(remainingFreeQuestions(0)).toBe(FREE_QUESTIONS_PER_AIRCRAFT);
    expect(remainingFreeQuestions(5)).toBe(FREE_QUESTIONS_PER_AIRCRAFT - 5);
  });

  it("never goes negative", () => {
    expect(remainingFreeQuestions(FREE_QUESTIONS_PER_AIRCRAFT + 50)).toBe(0);
  });
});

describe("canAnswerQuestion", () => {
  it("always allows a subscriber", () => {
    expect(
      canAnswerQuestion({
        hasSubscription: true,
        alreadyAnsweredThisQuestion: false,
        distinctAnsweredSoFar: FREE_QUESTIONS_PER_AIRCRAFT + 100,
      }),
    ).toBe(true);
  });

  it("allows a non-subscriber under the free limit", () => {
    expect(
      canAnswerQuestion({
        hasSubscription: false,
        alreadyAnsweredThisQuestion: false,
        distinctAnsweredSoFar: FREE_QUESTIONS_PER_AIRCRAFT - 1,
      }),
    ).toBe(true);
  });

  it("blocks a new question once the free limit is reached", () => {
    expect(
      canAnswerQuestion({
        hasSubscription: false,
        alreadyAnsweredThisQuestion: false,
        distinctAnsweredSoFar: FREE_QUESTIONS_PER_AIRCRAFT,
      }),
    ).toBe(false);
  });

  it("still allows revisiting a question already answered before, even over the limit", () => {
    expect(
      canAnswerQuestion({
        hasSubscription: false,
        alreadyAnsweredThisQuestion: true,
        distinctAnsweredSoFar: FREE_QUESTIONS_PER_AIRCRAFT + 10,
      }),
    ).toBe(true);
  });
});

describe("mapStripeSubscriptionStatus", () => {
  it("reads active and trialing as active", () => {
    expect(mapStripeSubscriptionStatus("active")).toBe("active");
    expect(mapStripeSubscriptionStatus("trialing")).toBe("active");
  });

  it("reads every other Stripe status as canceled, not a guess in between", () => {
    for (const status of [
      "canceled",
      "past_due",
      "unpaid",
      "incomplete",
      "incomplete_expired",
      "paused",
    ]) {
      expect(mapStripeSubscriptionStatus(status)).toBe("canceled");
    }
  });
});

describe("daysRemaining", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("is null when no period has been confirmed", () => {
    expect(daysRemaining(null, now)).toBeNull();
  });

  it("counts whole days ahead", () => {
    expect(daysRemaining(new Date("2026-01-31T12:00:00Z"), now)).toBe(30);
  });

  it("rounds a part day up, so the last hours are not reported as none", () => {
    // Eleven hours left is still a day of studying, not zero.
    expect(daysRemaining(new Date("2026-01-01T23:00:00Z"), now)).toBe(1);
  });

  it("is zero once the period has ended", () => {
    expect(daysRemaining(new Date("2025-12-31T12:00:00Z"), now)).toBe(0);
    expect(daysRemaining(now, now)).toBe(0);
  });
});
