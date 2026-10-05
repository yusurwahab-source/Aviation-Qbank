import { describe, expect, it } from "vitest";

import {
  formatClock,
  formatDuration,
  parseClock,
  parseCount,
  parseDuration,
  parseLogDate,
} from "@/lib/logbook/time";

describe("logbook time parsing", () => {
  it("reads durations as minutes", () => {
    expect(parseDuration("1:30")).toBe(90);
    expect(parseDuration("0:05")).toBe(5);
    expect(parseDuration("1234:05")).toBe(74045);
    expect(parseDuration("1.5")).toBe(90);
    expect(parseDuration(":45")).toBe(45);
    expect(parseDuration("2")).toBe(120);
    expect(parseDuration("1:75")).toBeNull();
    expect(parseDuration("130")).toBeNull();
    expect(parseDuration("")).toBeNull();
    expect(parseDuration(null)).toBeNull();
  });

  it("writes durations back as H:MM", () => {
    expect(formatDuration(90)).toBe("1:30");
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(74045)).toBe("1234:05");
    expect(formatDuration(null)).toBe("");
  });

  it("reads clock times with or without a colon", () => {
    expect(parseClock("14:05")).toBe(845);
    expect(parseClock("1405")).toBe(845);
    expect(parseClock("9:05")).toBe(545);
    expect(parseClock("25:00")).toBeNull();
    expect(formatClock(845)).toBe("14:05");
  });

  it("reads landing counts", () => {
    expect(parseCount("3")).toBe(3);
    expect(parseCount("x")).toBeNull();
  });

  it("reads European dates, and a year-less date with a fallback year", () => {
    expect(parseLogDate("12/03/24")).toEqual({ year: 2024, month: 3, day: 12 });
    expect(parseLogDate("12.03.1998")).toEqual({ year: 1998, month: 3, day: 12 });
    expect(parseLogDate("2024-03-12")).toEqual({ year: 2024, month: 3, day: 12 });
    expect(parseLogDate("12/03", 2023)).toEqual({ year: 2023, month: 3, day: 12 });
    expect(parseLogDate("12/03")).toBeNull();
    expect(parseLogDate("31/02/24")).toBeNull();
  });
});
