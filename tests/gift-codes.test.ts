import { describe, expect, it } from "vitest";

import {
  computeGiftPeriodEnd,
  generateGiftCode,
  normalizeGiftCode,
} from "@/lib/billing/gift-codes";

describe("generateGiftCode", () => {
  it("produces four dash-separated groups of four", () => {
    const bytes = new Uint8Array(16).fill(0);
    const code = generateGiftCode(bytes);
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("never contains the excluded look-alike characters", () => {
    // Every possible byte value, so every alphabet symbol gets exercised.
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) bytes[i] = i;
    const code = generateGiftCode(bytes.slice(0, 16));
    expect(code).not.toMatch(/[01ILO]/);
  });

  it("is deterministic for the same bytes", () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    expect(generateGiftCode(bytes)).toBe(generateGiftCode(bytes));
  });

  it("rejects too few bytes rather than silently truncating", () => {
    expect(() => generateGiftCode(new Uint8Array(8))).toThrow();
  });
});

describe("normalizeGiftCode", () => {
  it("uppercases and strips dashes", () => {
    expect(normalizeGiftCode("7k4m-qx2p-9rtn-5vwz")).toBe("7K4MQX2P9RTN5VWZ");
  });

  it("strips spaces too, however the redeemer separated the groups", () => {
    expect(normalizeGiftCode("7K4M QX2P 9RTN 5VWZ")).toBe("7K4MQX2P9RTN5VWZ");
  });

  it("agrees with itself regardless of separators", () => {
    expect(normalizeGiftCode("7K4M-QX2P-9RTN-5VWZ")).toBe(
      normalizeGiftCode("7k4mqx2p9rtn5vwz"),
    );
  });
});

describe("computeGiftPeriodEnd", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("grants now plus the duration when there is no existing access", () => {
    const end = computeGiftPeriodEnd(now, 30, null);
    expect(end).toEqual(new Date("2026-01-31T00:00:00Z"));
  });

  it("grants now plus the duration when existing access has already lapsed", () => {
    const past = new Date("2025-06-01T00:00:00Z");
    const end = computeGiftPeriodEnd(now, 30, past);
    expect(end).toEqual(new Date("2026-01-31T00:00:00Z"));
  });

  it("never pulls a later existing expiry backward", () => {
    const laterThanGrant = new Date("2026-06-01T00:00:00Z");
    const end = computeGiftPeriodEnd(now, 30, laterThanGrant);
    expect(end).toEqual(laterThanGrant);
  });

  it("extends past an existing expiry that ends sooner than the grant", () => {
    const soonerThanGrant = new Date("2026-01-05T00:00:00Z");
    const end = computeGiftPeriodEnd(now, 30, soonerThanGrant);
    expect(end).toEqual(new Date("2026-01-31T00:00:00Z"));
  });
});
