import { describe, expect, it } from "vitest";

import {
  canAccessSystem,
  capQuestionCount,
  examModeAllowed,
  filterAccessibleTopics,
  isPremiumUser,
  resolveAllowedTopics,
  smartTestAllowed,
} from "@/lib/billing/plan-access";

describe("isPremiumUser", () => {
  it("is false on the free plan with no subscription", () => {
    expect(
      isPremiumUser({ plan: { plan: "free", planExpiresAt: null }, subscription: null }),
    ).toBe(false);
  });

  it("is true on an unexpired premium plan", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60);
    expect(
      isPremiumUser({ plan: { plan: "premium", planExpiresAt: future }, subscription: null }),
    ).toBe(true);
  });

  it("is true on a premium plan with no expiry at all", () => {
    expect(
      isPremiumUser({ plan: { plan: "premium", planExpiresAt: null }, subscription: null }),
    ).toBe(true);
  });

  it("is false once a premium plan's expiry has passed", () => {
    const past = new Date(Date.now() - 1000);
    expect(
      isPremiumUser({ plan: { plan: "premium", planExpiresAt: past }, subscription: null }),
    ).toBe(false);
  });

  it("is true from an active Stripe subscription alone, even on the free plan", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60);
    expect(
      isPremiumUser({
        plan: { plan: "free", planExpiresAt: null },
        subscription: { status: "active", currentPeriodEnd: future },
      }),
    ).toBe(true);
  });
});

describe("canAccessSystem", () => {
  it("is always true for a premium account", () => {
    expect(canAccessSystem("Hydraulics", "B737", true)).toBe(true);
  });

  it("is true for a free system on a gated aircraft", () => {
    expect(canAccessSystem("Electrical", "B737", false)).toBe(true);
  });

  it("is false for a locked system on a gated aircraft", () => {
    expect(canAccessSystem("Hydraulics", "B737", false)).toBe(false);
  });

  it("is true for every system on an aircraft with no gating configured", () => {
    expect(canAccessSystem("Powerplant", "DA40", false)).toBe(true);
  });

  it("is case-insensitive on the aircraft code", () => {
    expect(canAccessSystem("Electrical", "b737", false)).toBe(true);
  });
});

describe("filterAccessibleTopics and accessibleTopics", () => {
  it("passes every topic through for a premium account", () => {
    expect(filterAccessibleTopics(["Fuel", "Hydraulics"], "B737", true)).toEqual([
      "Fuel",
      "Hydraulics",
    ]);
  });

  it("keeps only free systems for a free account on a gated aircraft", () => {
    expect(filterAccessibleTopics(["Fuel", "Hydraulics", "Electrical"], "B737", false)).toEqual([
      "Fuel",
      "Electrical",
    ]);
  });

  it("keeps everything for an aircraft with no gating configured", () => {
    expect(filterAccessibleTopics(["Airframe", "Powerplant"], "DA40", false)).toEqual([
      "Airframe",
      "Powerplant",
    ]);
  });
});

describe("resolveAllowedTopics", () => {
  const allB737 = ["Airplane General", "Electrical", "Fuel", "Hydraulics", "Flight Controls"];

  it("passes an explicit selection through unchanged for a premium account", () => {
    expect(resolveAllowedTopics(["Hydraulics"], allB737, "B737", true)).toEqual(["Hydraulics"]);
  });

  it("passes an empty selection through unchanged for a premium account", () => {
    expect(resolveAllowedTopics([], allB737, "B737", true)).toEqual([]);
  });

  it("expands an empty selection to the free systems for a free account", () => {
    expect(resolveAllowedTopics([], allB737, "B737", false)).toEqual([
      "Airplane General",
      "Electrical",
      "Fuel",
    ]);
  });

  it("narrows a mixed selection down to the free systems within it", () => {
    expect(resolveAllowedTopics(["Fuel", "Hydraulics"], allB737, "B737", false)).toEqual(["Fuel"]);
  });

  it("falls back to every free system when the request names only locked ones", () => {
    expect(resolveAllowedTopics(["Hydraulics", "Flight Controls"], allB737, "B737", false)).toEqual(
      ["Airplane General", "Electrical", "Fuel"],
    );
  });

  it("is a no-op on an aircraft with no gating configured", () => {
    expect(resolveAllowedTopics(["Powerplant"], ["Airframe", "Powerplant"], "DA40", false)).toEqual(
      ["Powerplant"],
    );
  });
});

describe("capQuestionCount", () => {
  it("caps a free account at the free plan's limit", () => {
    expect(capQuestionCount(500, false)).toBe(20);
  });

  it("never raises a smaller request up to the cap", () => {
    expect(capQuestionCount(5, false)).toBe(5);
  });

  it("does not cap a premium account", () => {
    expect(capQuestionCount(5000, true)).toBe(5000);
  });
});

describe("examModeAllowed and smartTestAllowed", () => {
  it("are both false on the free plan", () => {
    expect(examModeAllowed(false)).toBe(false);
    expect(smartTestAllowed(false)).toBe(false);
  });

  it("are both true on the premium plan", () => {
    expect(examModeAllowed(true)).toBe(true);
    expect(smartTestAllowed(true)).toBe(true);
  });
});
