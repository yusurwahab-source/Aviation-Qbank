import { describe, expect, it } from "vitest";

import { formatStudyDuration } from "@/lib/format-duration";

describe("formatStudyDuration", () => {
  it("reads a near-zero duration as friendly text, not '0m'", () => {
    expect(formatStudyDuration(0)).toBe("Less than a minute");
    expect(formatStudyDuration(30)).toBe("Less than a minute");
  });

  it("shows whole minutes under an hour", () => {
    expect(formatStudyDuration(90)).toBe("1m");
    expect(formatStudyDuration(59 * 60)).toBe("59m");
  });

  it("shows hours and minutes together", () => {
    expect(formatStudyDuration(3661)).toBe("1h 1m");
  });

  it("drops a zero minutes component rather than showing 'Xh 0m'", () => {
    expect(formatStudyDuration(7200)).toBe("2h");
  });

  it("never goes negative", () => {
    expect(formatStudyDuration(-100)).toBe("Less than a minute");
  });
});
