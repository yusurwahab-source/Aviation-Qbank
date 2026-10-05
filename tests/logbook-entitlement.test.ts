import { describe, expect, it } from "vitest";

import {
  FREE_SPREADS_PER_ACCOUNT,
  SPREADS_PER_UNLOCK,
  availableUnlocks,
  decideExtraction,
  pickUnlockSource,
  spreadsRemaining,
} from "@/lib/logbook/entitlement";

describe("logbook entitlement", () => {
  it("gives every account two free spreads, then needs an unlock", () => {
    expect(decideExtraction({ freeSpreadsUsed: 0, logbookUnlocked: false, logbookUnlockSpreadsUsed: 0 })).toEqual({
      allowed: true,
      chargeTo: "free",
    });
    expect(
      decideExtraction({ freeSpreadsUsed: FREE_SPREADS_PER_ACCOUNT, logbookUnlocked: false, logbookUnlockSpreadsUsed: 0 }),
    ).toEqual({ allowed: false, reason: "free_exhausted" });
  });

  it("spends free spreads before an unlock's, and stops an unlock at forty", () => {
    expect(decideExtraction({ freeSpreadsUsed: 1, logbookUnlocked: true, logbookUnlockSpreadsUsed: 0 }).allowed).toBe(true);
    expect(decideExtraction({ freeSpreadsUsed: 2, logbookUnlocked: true, logbookUnlockSpreadsUsed: 39 })).toEqual({
      allowed: true,
      chargeTo: "unlock",
    });
    expect(
      decideExtraction({ freeSpreadsUsed: 2, logbookUnlocked: true, logbookUnlockSpreadsUsed: SPREADS_PER_UNLOCK }),
    ).toEqual({ allowed: false, reason: "logbook_full" });
    expect(spreadsRemaining({ freeSpreadsUsed: 1, logbookUnlocked: true, logbookUnlockSpreadsUsed: 10 })).toBe(31);
  });

  it("counts a subscriber's included conversion once", () => {
    expect(availableUnlocks({ unusedCredits: 0, hasActiveSubscription: true, subscriptionCreditUsed: false })).toBe(1);
    expect(availableUnlocks({ unusedCredits: 0, hasActiveSubscription: true, subscriptionCreditUsed: true })).toBe(0);
    expect(availableUnlocks({ unusedCredits: 2, hasActiveSubscription: false, subscriptionCreditUsed: false })).toBe(2);
  });

  it("spends a held credit before the subscription's included one", () => {
    expect(pickUnlockSource({ unusedCredits: 1, hasActiveSubscription: true, subscriptionCreditUsed: false })).toBe("credit");
    expect(pickUnlockSource({ unusedCredits: 0, hasActiveSubscription: true, subscriptionCreditUsed: false })).toBe(
      "subscription",
    );
    expect(pickUnlockSource({ unusedCredits: 0, hasActiveSubscription: false, subscriptionCreditUsed: false })).toBeNull();
  });
});
