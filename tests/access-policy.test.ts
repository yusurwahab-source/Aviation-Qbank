import { describe, expect, it } from "vitest";

import {
  FREE_QUESTIONS_PER_AIRCRAFT,
  canAnswerQuestion,
  hasActiveSubscription,
  periodEndFor,
  remainingFreeQuestions,
  subscriptionStatusForOrderStatus,
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

describe("periodEndFor", () => {
  it("gives a monthly plan 30 days", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    expect(periodEndFor("monthly", from)).toEqual(new Date("2026-01-31T00:00:00Z"));
  });

  it("gives a yearly plan 365 days", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    expect(periodEndFor("yearly", from)).toEqual(new Date("2027-01-01T00:00:00Z"));
  });
});

describe("subscriptionStatusForOrderStatus", () => {
  it("reads a successful payment as active", () => {
    expect(subscriptionStatusForOrderStatus("COMPLETE")).toBe("active");
    expect(subscriptionStatusForOrderStatus("payment_received")).toBe("active");
  });

  it("reads a cancellation, refund or chargeback as canceled", () => {
    for (const status of ["CANCELED", "REFUND", "REVERSED", "CHARGEBACK_OPEN", "CHARGEBACK_CLOSED"]) {
      expect(subscriptionStatusForOrderStatus(status)).toBe("canceled");
    }
  });

  it("does not guess at an in-between status", () => {
    for (const status of ["PENDING", "PROCESSING", "SOMETHING_UNKNOWN"]) {
      expect(subscriptionStatusForOrderStatus(status)).toBeNull();
    }
  });
});
