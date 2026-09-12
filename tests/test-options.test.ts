import { describe, expect, it } from "vitest";

import {
  DEFAULT_TEST_LENGTH,
  MAX_TEST_LENGTH,
  parseTestLength,
  parseTopic,
} from "@/lib/test-options";

describe("parseTestLength", () => {
  it("takes a sensible number", () => {
    expect(parseTestLength("5")).toBe(5);
    expect(parseTestLength("20")).toBe(20);
  });

  it("falls back to the default for anything missing or nonsensical", () => {
    for (const value of [undefined, "", "abc", "0", "-3", "1.5", "1.5.2", "10abc", " "]) {
      expect(parseTestLength(value)).toBe(DEFAULT_TEST_LENGTH);
    }
  });

  it("clamps an absurd request rather than obeying it", () => {
    expect(parseTestLength("9999")).toBe(MAX_TEST_LENGTH);
  });
});

describe("parseTopic", () => {
  it("keeps a real topic, trimmed", () => {
    expect(parseTopic("Fuel System")).toBe("Fuel System");
    expect(parseTopic("  Electrical  ")).toBe("Electrical");
  });

  it("returns undefined — meaning every topic — for anything unusable", () => {
    // A mangled link should still give the student a test, not an empty screen.
    for (const value of [undefined, "", "   ", "x".repeat(61)]) {
      expect(parseTopic(value)).toBeUndefined();
    }
  });

  it("takes the first value when a parameter is repeated", () => {
    expect(parseTopic(["Fuel System", "Electrical"])).toBe("Fuel System");
  });

  it("passes a topic through unchanged rather than sanitising it", () => {
    // It reaches the database as a bound parameter, so an exotic value simply
    // matches nothing. Rewriting it here would break legitimate topic names.
    expect(parseTopic("O'Brien & Sons")).toBe("O'Brien & Sons");
  });
});
