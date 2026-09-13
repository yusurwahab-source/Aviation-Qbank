import { describe, expect, it } from "vitest";

import {
  RESET_TOKEN_LIFETIME_MS,
  resetExpiryFrom,
  resetTokenState,
  withMinimumDuration,
} from "@/lib/auth/reset-policy";

/**
 * A reset link is the one thing in this app that takes over an account
 * without the password, so the conditions under which it works are tested
 * exhaustively rather than trusted to read correctly.
 */

describe("resetTokenState", () => {
  const now = new Date("2026-01-01T12:00:00.000Z");
  const later = (ms: number) => new Date(now.getTime() + ms);

  it("accepts an unspent link inside its hour", () => {
    expect(resetTokenState({ expiresAt: later(MINUTE), usedAt: null }, now)).toBe("valid");
  });

  it("refuses a link past its expiry", () => {
    expect(resetTokenState({ expiresAt: later(-1), usedAt: null }, now)).toBe("expired");
  });

  it("treats the expiry instant itself as gone", () => {
    // Off-by-one in the generous direction would leave a link alive for one
    // more tick. Cheap to pin down, so it is pinned down.
    expect(resetTokenState({ expiresAt: now, usedAt: null }, now)).toBe("expired");
  });

  it("refuses a link that has already been used", () => {
    expect(resetTokenState({ expiresAt: later(MINUTE), usedAt: later(-10) }, now)).toBe("used");
  });

  it("says 'used' rather than 'expired' when a spent link has also aged out", () => {
    // Both are refusals, so this only decides which truth is reported. "You
    // have already used this link" is the more useful one, and it does not
    // invite a retry the way "expired" does.
    expect(resetTokenState({ expiresAt: later(-1), usedAt: later(-10) }, now)).toBe("used");
  });

  it("refuses a token that does not exist at all", () => {
    // An invented token, or one superseded by a newer request. Its own answer
    // rather than folded into "expired", so a test can tell them apart even
    // though the screen does not.
    expect(resetTokenState(null, now)).toBe("unknown");
  });

  it("never returns 'valid' for anything but a live, unspent row", () => {
    // The property that matters, stated as one assertion: exactly one of the
    // four inputs below is usable.
    const cases: Array<{ expiresAt: Date; usedAt: Date | null }> = [
      { expiresAt: later(MINUTE), usedAt: null },
      { expiresAt: later(-MINUTE), usedAt: null },
      { expiresAt: later(MINUTE), usedAt: now },
      { expiresAt: later(-MINUTE), usedAt: now },
    ];
    const valid = cases.filter((facts) => resetTokenState(facts, now) === "valid");
    expect(valid).toHaveLength(1);
  });
});

const MINUTE = 60 * 1000;

describe("resetExpiryFrom", () => {
  it("puts a link's expiry a lifetime after it was issued", () => {
    const issued = new Date("2026-01-01T12:00:00.000Z");
    expect(resetExpiryFrom(issued).getTime() - issued.getTime()).toBe(RESET_TOKEN_LIFETIME_MS);
  });

  it("is an hour", () => {
    expect(RESET_TOKEN_LIFETIME_MS).toBe(60 * MINUTE);
  });
});

describe("withMinimumDuration", () => {
  /** A fake clock, so the padding can be asserted without waiting for it. */
  function fakeClock() {
    let current = 0;
    const slept: number[] = [];
    return {
      now: () => current,
      advance: (ms: number) => {
        current += ms;
      },
      slept,
      sleep: async (ms: number) => {
        slept.push(ms);
        current += ms;
      },
    };
  }

  it("pads fast work out to the floor", async () => {
    // The anti-enumeration property: "no such account" costs almost nothing,
    // and must not therefore answer faster than a real send.
    const clock = fakeClock();
    const result = await withMinimumDuration(
      async () => {
        clock.advance(5);
        return "answered";
      },
      900,
      clock.sleep,
      clock.now,
    );

    expect(result).toBe("answered");
    expect(clock.slept).toEqual([895]);
    expect(clock.now()).toBe(900);
  });

  it("does not hold back work that already took longer", async () => {
    // It pads, never truncates. A slow send is returned as soon as it is
    // done rather than made to wait out a second floor.
    const clock = fakeClock();
    await withMinimumDuration(
      async () => {
        clock.advance(1500);
        return null;
      },
      900,
      clock.sleep,
      clock.now,
    );

    expect(clock.slept).toEqual([]);
    expect(clock.now()).toBe(1500);
  });

  it("makes two very different amounts of work take the same time", async () => {
    // Stated as the thing it is actually for: an attacker timing the two
    // responses learns nothing from them.
    const elapsed: number[] = [];
    for (const cost of [2, 400]) {
      const clock = fakeClock();
      await withMinimumDuration(
        async () => {
          clock.advance(cost);
        },
        900,
        clock.sleep,
        clock.now,
      );
      elapsed.push(clock.now());
    }
    expect(elapsed[0]).toBe(elapsed[1]);
  });

  it("returns whatever the work returned, padding aside", async () => {
    const clock = fakeClock();
    const value = await withMinimumDuration(async () => ({ sent: true }), 900, clock.sleep, clock.now);
    expect(value).toEqual({ sent: true });
  });

  it("still pads when the work throws, so a failure is not a faster answer", async () => {
    // Not currently reachable — the action catches its own failures — but a
    // future caller that lets one through must not get a timing channel for
    // free. Throwing is the one thing that can fail fast, which is exactly
    // what would make it distinguishable.
    const clock = fakeClock();
    await expect(
      withMinimumDuration(
        async () => {
          clock.advance(3);
          throw new Error("send failed");
        },
        900,
        clock.sleep,
        clock.now,
      ),
    ).rejects.toThrow("send failed");

    expect(clock.slept).toEqual([897]);
    expect(clock.now()).toBe(900);
  });
});
