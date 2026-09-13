import { describe, expect, it } from "vitest";

import {
  ALL_QUESTIONS,
  DEFAULT_TEST_LENGTH,
  buildTestHref,
  parseTestLength,
  parseTopics,
  resolveTestSize,
} from "@/lib/test-options";

describe("parseTestLength", () => {
  it("takes any whole number the student typed", () => {
    expect(parseTestLength("5")).toBe(5);
    expect(parseTestLength("20")).toBe(20);
    // The point of the change: nothing here is a fixed menu of lengths.
    expect(parseTestLength("7")).toBe(7);
    expect(parseTestLength("143")).toBe(143);
  });

  it("understands 'all'", () => {
    expect(parseTestLength("all")).toBe(ALL_QUESTIONS);
    expect(parseTestLength("ALL")).toBe(ALL_QUESTIONS);
    expect(parseTestLength(" all ")).toBe(ALL_QUESTIONS);
  });

  it("falls back to the default for anything missing or nonsensical", () => {
    for (const value of [undefined, "", "abc", "0", "-3", "1.5", "1.5.2", "10abc", " "]) {
      expect(parseTestLength(value)).toBe(DEFAULT_TEST_LENGTH);
    }
  });

  it("does not clamp a large request here", () => {
    // There is no arbitrary ceiling any more. A number bigger than the bank is
    // cut down to what exists by `resolveTestSize`, which knows how many there
    // actually are — this function does not.
    expect(parseTestLength("9999")).toBe(9999);
  });

  it("takes the first value when the parameter is repeated", () => {
    expect(parseTestLength(["15", "20"])).toBe(15);
  });
});

describe("parseTopics", () => {
  it("keeps real sections, trimmed", () => {
    expect(parseTopics("Fuel System")).toEqual(["Fuel System"]);
    expect(parseTopics("  Electrical  ")).toEqual(["Electrical"]);
  });

  it("keeps every section when the parameter repeats", () => {
    // This is how a set of checkboxes submits.
    expect(parseTopics(["Fuel System", "Electrical"])).toEqual(["Fuel System", "Electrical"]);
  });

  it("returns an empty list — meaning every section — for anything unusable", () => {
    // A mangled link should still give the student a test, not an empty screen.
    for (const value of [undefined, "", "   ", "x".repeat(61)]) {
      expect(parseTopics(value)).toEqual([]);
    }
  });

  it("drops duplicates, which would only skew the draw", () => {
    expect(parseTopics(["Fuel System", "Fuel System"])).toEqual(["Fuel System"]);
  });

  it("bounds how many sections a hostile URL can ask for", () => {
    const many = Array.from({ length: 200 }, (_, i) => `Topic ${i}`);
    expect(parseTopics(many)).toHaveLength(50);
  });

  it("passes a section name through unchanged rather than sanitising it", () => {
    // It reaches the database as a bound parameter, so an exotic value simply
    // matches nothing. Rewriting it here would break legitimate section names.
    expect(parseTopics("O'Brien & Sons")).toEqual(["O'Brien & Sons"]);
  });
});

describe("resolveTestSize", () => {
  it("gives the whole selection for 'all'", () => {
    expect(resolveTestSize(ALL_QUESTIONS, 16)).toBe(16);
  });

  it("never asks for more questions than exist", () => {
    expect(resolveTestSize(50, 16)).toBe(16);
    expect(resolveTestSize(10, 16)).toBe(10);
  });

  it("returns zero when the selection is empty", () => {
    expect(resolveTestSize(ALL_QUESTIONS, 0)).toBe(0);
    expect(resolveTestSize(10, 0)).toBe(0);
  });
});

describe("buildTestHref", () => {
  it("builds a plain test link", () => {
    expect(buildTestHref("DA40")).toBe("/aircraft/DA40/test");
  });

  it("repeats the topic parameter, one per section", () => {
    expect(buildTestHref("DA40", { topics: ["Fuel System", "Electrical"], length: 10 })).toBe(
      "/aircraft/DA40/test?topic=Fuel+System&topic=Electrical&questions=10",
    );
  });

  it("carries 'all' through", () => {
    expect(buildTestHref("DA40", { length: ALL_QUESTIONS })).toBe(
      "/aircraft/DA40/test?questions=all",
    );
  });

  it("round-trips through the parsers", () => {
    const href = buildTestHref("DA40", { topics: ["O'Brien & Sons"], length: ALL_QUESTIONS });
    const query = new URLSearchParams(href.split("?")[1]);
    expect(parseTopics(query.getAll("topic"))).toEqual(["O'Brien & Sons"]);
    expect(parseTestLength(query.get("questions") ?? undefined)).toBe(ALL_QUESTIONS);
  });
});
