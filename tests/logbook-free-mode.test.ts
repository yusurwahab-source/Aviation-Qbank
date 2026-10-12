import { describe, expect, it } from "vitest";

import {
  FREE_SPREADS_PER_ACCOUNT,
  SPREADS_PER_UNLOCK,
  decideExtraction,
  spreadsRemaining,
} from "@/lib/logbook/entitlement";

describe("logbook in free mode", () => {
  it("lets an account with no spreads used scan, recorded against the logbook", () => {
    expect(
      decideExtraction({ freeSpreadsUsed: 0, logbookUnlocked: false, logbookUnlockSpreadsUsed: 0, freeMode: true }),
    ).toEqual({ allowed: true, chargeTo: "unlock" });
  });

  it("does not run out after the paid free spreads are gone", () => {
    expect(
      decideExtraction({
        freeSpreadsUsed: FREE_SPREADS_PER_ACCOUNT + 5,
        logbookUnlocked: false,
        logbookUnlockSpreadsUsed: 3,
        freeMode: true,
      }),
    ).toEqual({ allowed: true, chargeTo: "unlock" });
  });

  it("still caps each logbook at SPREADS_PER_UNLOCK", () => {
    expect(
      decideExtraction({
        freeSpreadsUsed: 0,
        logbookUnlocked: false,
        logbookUnlockSpreadsUsed: SPREADS_PER_UNLOCK,
        freeMode: true,
      }),
    ).toEqual({ allowed: false, reason: "logbook_full" });
  });

  it("counts remaining spreads against the logbook alone", () => {
    expect(
      spreadsRemaining({ freeSpreadsUsed: 9, logbookUnlocked: false, logbookUnlockSpreadsUsed: 10, freeMode: true }),
    ).toBe(SPREADS_PER_UNLOCK - 10);
  });

  it("leaves the paid rules exactly as they were when the flag is off", () => {
    expect(
      decideExtraction({ freeSpreadsUsed: FREE_SPREADS_PER_ACCOUNT, logbookUnlocked: false, logbookUnlockSpreadsUsed: 0 }),
    ).toEqual({ allowed: false, reason: "free_exhausted" });
  });
});
