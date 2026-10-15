import { describe, expect, it } from "vitest";

import {
  RATE_LIMIT_RULES,
  combine,
  decide,
  describeWait,
  type RateLimitRule,
} from "@/lib/auth/rate-limit-policy";

const MINUTE = 60 * 1000;
const rule: RateLimitRule = { maxFailures: 5, windowMs: 15 * MINUTE };
const now = new Date("2026-01-01T12:00:00Z");
const minutesAgo = (n: number) => new Date(now.getTime() - n * MINUTE);

describe("decide", () => {
  it("allows an attempt below the limit", () => {
    expect(decide(rule, 0, null, now)).toEqual({ allowed: true });
    expect(decide(rule, 4, minutesAgo(1), now)).toEqual({ allowed: true });
  });

  it("blocks once the limit is reached", () => {
    const result = decide(rule, 5, minutesAgo(1), now);
    expect(result.allowed).toBe(false);
  });

  it("reports the wait measured from the oldest failure", () => {
    // Oldest failure 5 minutes ago, 15-minute window: 10 minutes left.
    const result = decide(rule, 5, minutesAgo(5), now);
    expect(result).toEqual({ allowed: false, retryAfterMs: 10 * MINUTE });
  });

  it("lifts the block once the window has passed", () => {
    expect(decide(rule, 99, minutesAgo(15), now)).toEqual({ allowed: true });
    expect(decide(rule, 99, minutesAgo(60), now)).toEqual({ allowed: true });
  });

  it("never blocks forever: the wait always shrinks as time passes", () => {
    const first = decide(rule, 5, minutesAgo(1), now);
    const later = decide(rule, 5, minutesAgo(1), new Date(now.getTime() + 5 * MINUTE));

    expect(first.allowed).toBe(false);
    expect(later.allowed).toBe(false);
    if (!first.allowed && !later.allowed) {
      expect(later.retryAfterMs).toBeLessThan(first.retryAfterMs);
    }
  });

  it("allows rather than blocks when the timestamp is missing", () => {
    // Incomplete data must not lock someone out — there is no password reset
    // to rescue them with.
    expect(decide(rule, 999, null, now)).toEqual({ allowed: true });
  });
});

describe("combine", () => {
  it("allows only when every rule allows", () => {
    expect(combine([{ allowed: true }, { allowed: true }])).toEqual({ allowed: true });
    expect(combine([])).toEqual({ allowed: true });
  });

  it("blocks when any rule blocks", () => {
    const result = combine([{ allowed: true }, { allowed: false, retryAfterMs: 1000 }]);
    expect(result).toEqual({ allowed: false, retryAfterMs: 1000 });
  });

  it("reports the longest wait", () => {
    const result = combine([
      { allowed: false, retryAfterMs: 1000 },
      { allowed: false, retryAfterMs: 9000 },
    ]);
    expect(result).toEqual({ allowed: false, retryAfterMs: 9000 });
  });
});

describe("the rules the application actually uses", () => {
  it("are tighter per email than per address", () => {
    // One account being ground through should trip sooner than a shared office
    // network with several people signing in.
    expect(RATE_LIMIT_RULES.perEmail.maxFailures).toBeLessThan(
      RATE_LIMIT_RULES.perIp.maxFailures,
    );
  });

  it("both expire, so nothing is ever locked permanently", () => {
    for (const r of Object.values(RATE_LIMIT_RULES)) {
      expect(r.windowMs).toBeGreaterThan(0);
      expect(Number.isFinite(r.windowMs)).toBe(true);
      // A window a person would actually wait out rather than give up on.
      expect(r.windowMs).toBeLessThanOrEqual(60 * MINUTE);
    }
  });

  it("leave room for an honest person mistyping a password", () => {
    expect(RATE_LIMIT_RULES.perEmail.maxFailures).toBeGreaterThanOrEqual(3);
  });

  it("limits AI search requests to three per identity per minute", () => {
    expect(RATE_LIMIT_RULES.aiSearchPerIdentity.maxFailures).toBe(3);
    expect(RATE_LIMIT_RULES.aiSearchPerIdentity.windowMs).toBe(MINUTE);
  });
});

describe("describeWait", () => {
  it("puts the wait in words someone can act on", () => {
    expect(describeWait(30 * 1000)).toBe("in less than a minute");
    expect(describeWait(60 * 1000)).toBe("in less than a minute");
    expect(describeWait(61 * 1000)).toBe("in about 2 minutes");
    expect(describeWait(10 * MINUTE)).toBe("in about 10 minutes");
    expect(describeWait(90 * MINUTE)).toBe("in about 2 hours");
  });

  it("never says zero or a negative wait", () => {
    expect(describeWait(0)).toBe("in less than a minute");
    expect(describeWait(-5000)).toBe("in less than a minute");
  });
});
