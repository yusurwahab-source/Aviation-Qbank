import { describe, expect, it } from "vitest";

import {
  ALL_QUESTIONS,
  DEFAULT_TEST_LENGTH,
  DEFAULT_TEST_MODE,
  buildClassResumeHref,
  buildClassTestHref,
  buildResumeHref,
  buildTestHref,
  EXAM_SECONDS_PER_QUESTION,
  deadlineFrom,
  formatClock,
  parseTestLength,
  parseTestMode,
  parseTopics,
  resolveTestSize,
  secondsLeft,
  secondsSince,
  timeLimitFor,
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
    expect(buildTestHref("DA40")).toBe("/type-rating/DA40/test");
  });

  it("repeats the topic parameter, one per section", () => {
    expect(buildTestHref("DA40", { topics: ["Fuel System", "Electrical"], length: 10 })).toBe(
      "/type-rating/DA40/test?topic=Fuel+System&topic=Electrical&questions=10",
    );
  });

  it("carries 'all' through", () => {
    expect(buildTestHref("DA40", { length: ALL_QUESTIONS })).toBe(
      "/type-rating/DA40/test?questions=all",
    );
  });

  it("round-trips through the parsers", () => {
    const href = buildTestHref("DA40", { topics: ["O'Brien & Sons"], length: ALL_QUESTIONS });
    const query = new URLSearchParams(href.split("?")[1]);
    expect(parseTopics(query.getAll("topic"))).toEqual(["O'Brien & Sons"]);
    expect(parseTestLength(query.get("questions") ?? undefined)).toBe(ALL_QUESTIONS);
  });

  it("sets from=incorrect for a retry link", () => {
    expect(buildTestHref("DA40", { retryOnly: true })).toBe("/type-rating/DA40/test?from=incorrect");
  });

  it("sets from=flagged or from=unseen for the other two presets", () => {
    expect(buildTestHref("DA40", { from: "flagged" })).toBe("/type-rating/DA40/test?from=flagged");
    expect(buildTestHref("DA40", { from: "unseen" })).toBe("/type-rating/DA40/test?from=unseen");
  });

  it("prefers retryOnly if both are somehow set", () => {
    expect(buildTestHref("DA40", { retryOnly: true, from: "flagged" })).toBe(
      "/type-rating/DA40/test?from=incorrect",
    );
  });
});

describe("buildResumeHref", () => {
  it("carries the session's own id as ?t=", () => {
    expect(
      buildResumeHref({ clientTestId: "abc123", aircraftCode: "DA40", mode: "study", topics: [] }),
    ).toBe("/type-rating/DA40/test?t=abc123");
  });

  it("includes mode only when it is not the default", () => {
    expect(
      buildResumeHref({ clientTestId: "abc123", aircraftCode: "DA40", mode: "exam", topics: [] }),
    ).toBe("/type-rating/DA40/test?t=abc123&mode=exam");
  });

  it("repeats topic, one per section", () => {
    expect(
      buildResumeHref({
        clientTestId: "abc123",
        aircraftCode: "DA40",
        mode: "study",
        topics: ["Fuel System", "Electrical"],
      }),
    ).toBe("/type-rating/DA40/test?t=abc123&topic=Fuel+System&topic=Electrical");
  });

  it("round-trips through parseTestMode and parseTopics", () => {
    const href = buildResumeHref({
      clientTestId: "abc123",
      aircraftCode: "DA40",
      mode: "exam",
      topics: ["Fuel System"],
    });
    const query = new URLSearchParams(href.split("?")[1]);
    expect(query.get("t")).toBe("abc123");
    expect(parseTestMode(query.get("mode") ?? undefined)).toBe("exam");
    expect(parseTopics(query.getAll("topic"))).toEqual(["Fuel System"]);
  });
});

describe("buildClassTestHref and buildClassResumeHref", () => {
  it("build the same shape of link under /class-rating instead of /type-rating", () => {
    expect(buildClassTestHref("SEP")).toBe("/class-rating/SEP/test");
    expect(buildClassTestHref("SEP", { topics: ["Systems"], length: 10 })).toBe(
      "/class-rating/SEP/test?topic=Systems&questions=10",
    );
    expect(buildClassTestHref("SEP", { retryOnly: true })).toBe("/class-rating/SEP/test?from=incorrect");
  });

  it("never produces a /type-rating/ link", () => {
    expect(buildClassTestHref("SEP", { length: ALL_QUESTIONS })).not.toContain("/type-rating/");
    expect(
      buildClassResumeHref({ clientTestId: "abc123", aircraftCode: "SEP", mode: "exam", topics: [] }),
    ).toBe("/class-rating/SEP/test?t=abc123&mode=exam");
  });

  it("stays independent of the aircraft builders — same code, different base", () => {
    // The two must never collide: an aircraft code that happened to match a
    // class code still gets two different links.
    expect(buildTestHref("SEP")).toBe("/type-rating/SEP/test");
    expect(buildClassTestHref("SEP")).toBe("/class-rating/SEP/test");
  });
});

describe("parseTestMode", () => {
  it("takes either mode by name", () => {
    expect(parseTestMode("study")).toBe("study");
    expect(parseTestMode("exam")).toBe("exam");
  });

  it("is forgiving about case and spacing", () => {
    expect(parseTestMode(" EXAM ")).toBe("exam");
    expect(parseTestMode("Study")).toBe("study");
  });

  it("falls back to study for anything missing or unreadable", () => {
    // Study is the safe default: someone who has not chosen is practising,
    // and practice is better with the explanation in front of them.
    for (const value of [undefined, "", "   ", "practice", "hard", "1"]) {
      expect(parseTestMode(value)).toBe(DEFAULT_TEST_MODE);
      expect(parseTestMode(value)).toBe("study");
    }
  });

  it("takes the first value when the parameter is repeated", () => {
    expect(parseTestMode(["exam", "study"])).toBe("exam");
  });
});

describe("buildTestHref with a mode", () => {
  it("names exam mode in the URL", () => {
    expect(buildTestHref("DA40", { length: 10, mode: "exam" })).toBe(
      "/type-rating/DA40/test?questions=10&mode=exam",
    );
  });

  it("leaves the default out, so an ordinary link stays short", () => {
    expect(buildTestHref("DA40", { length: 10, mode: "study" })).toBe(
      "/type-rating/DA40/test?questions=10",
    );
    expect(buildTestHref("DA40", { length: 10 })).toBe("/type-rating/DA40/test?questions=10");
  });

  it("round-trips through the parser", () => {
    for (const mode of ["study", "exam"] as const) {
      const href = buildTestHref("DA40", { topics: ["Fuel System"], mode });
      const query = new URLSearchParams(href.split("?")[1] ?? "");
      expect(parseTestMode(query.get("mode") ?? undefined)).toBe(mode);
    }
  });
});

describe("timeLimitFor", () => {
  it("gives an exam a minute a question", () => {
    expect(timeLimitFor("exam", 20)).toBe(20 * 60);
    expect(timeLimitFor("exam", 1)).toBe(60);
    expect(timeLimitFor("exam", 60)).toBe(60 * 60);
  });

  it("leaves study mode untimed, whatever its size", () => {
    // The rule the owner asked for: the clock belongs to the exam. In study
    // mode the screen shows elapsed time and nothing hangs on it, so there is
    // no limit for any length of test to produce.
    for (const count of [1, 10, 500]) {
      expect(timeLimitFor("study", count)).toBeNull();
    }
  });

  it("never returns a clock that is already spent", () => {
    // A zero-question test does not reach the runner, but a zero-second
    // limit would expire the instant it was drawn, so it must not exist.
    expect(timeLimitFor("exam", 0)).toBe(EXAM_SECONDS_PER_QUESTION);
  });

  it("is a pure function of the mode and the count", () => {
    // Which is the point of deriving it instead of parsing it: there is no
    // request, stale link or edited URL that can produce a different answer
    // for the same test.
    expect(timeLimitFor("exam", 22)).toBe(timeLimitFor("exam", 22));
  });
});

describe("deadlineFrom and secondsLeft", () => {
  const started = new Date("2026-01-01T12:00:00.000Z");

  it("puts the deadline a limit's worth after the start", () => {
    expect(deadlineFrom(started, 600).toISOString()).toBe("2026-01-01T12:10:00.000Z");
  });

  it("counts down against a fixed deadline", () => {
    const deadline = deadlineFrom(started, 600);
    expect(secondsLeft(deadline, started)).toBe(600);
    expect(secondsLeft(deadline, new Date("2026-01-01T12:05:00.000Z"))).toBe(300);
    expect(secondsLeft(deadline, new Date("2026-01-01T12:09:59.000Z"))).toBe(1);
  });

  it("never goes negative — a long-gone deadline is simply zero", () => {
    // What a test resumed a day late must report, rather than a negative
    // number the countdown would happily render.
    const deadline = deadlineFrom(started, 600);
    expect(secondsLeft(deadline, new Date("2026-01-01T12:10:00.000Z"))).toBe(0);
    expect(secondsLeft(deadline, new Date("2026-01-02T12:00:00.000Z"))).toBe(0);
  });

  it("is what makes a refresh unable to buy more time", () => {
    // The property the whole stored-clock design exists for: the deadline
    // depends only on when the test started, so recomputing it later — which
    // is exactly what a reload does — yields the same instant every time.
    const first = deadlineFrom(started, 1800);
    const afterAReload = deadlineFrom(started, 1800);
    expect(afterAReload.getTime()).toBe(first.getTime());
  });
});

describe("formatClock", () => {
  it("shows minutes and seconds", () => {
    expect(formatClock(600)).toBe("10:00");
    expect(formatClock(59)).toBe("0:59");
    expect(formatClock(61)).toBe("1:01");
    expect(formatClock(0)).toBe("0:00");
  });

  it("grows an hours column only once there is one", () => {
    expect(formatClock(3600)).toBe("1:00:00");
    expect(formatClock(3661)).toBe("1:01:01");
    expect(formatClock(3599)).toBe("59:59");
  });

  it("never renders a negative clock", () => {
    expect(formatClock(-5)).toBe("0:00");
  });
});

describe("secondsSince", () => {
  const started = new Date("2026-01-01T12:00:00.000Z");

  it("counts up from a fixed start", () => {
    expect(secondsSince(started, started)).toBe(0);
    expect(secondsSince(started, new Date("2026-01-01T12:05:00.000Z"))).toBe(300);
    expect(secondsSince(started, new Date("2026-01-01T13:00:00.000Z"))).toBe(3600);
  });

  it("never goes negative on a clock skewed backwards", () => {
    expect(secondsSince(started, new Date("2026-01-01T11:59:00.000Z"))).toBe(0);
  });

  it("is what makes a refresh show the same elapsed time", () => {
    // The study-mode counterpart of the deadline property above: derived
    // from a stored start, so re-reading it later — which is what a reload
    // does — continues the count rather than restarting it.
    const now = new Date("2026-01-01T12:07:30.000Z");
    expect(secondsSince(started, now)).toBe(secondsSince(started, now));
    expect(secondsSince(started, now)).toBe(450);
  });
});

describe("buildTestHref no longer carries a clock", () => {
  it("says nothing about time, because time is not a choice any more", () => {
    // The limit follows the mode and the question count, so a URL that named
    // minutes could only disagree with the test it opens.
    for (const mode of ["study", "exam"] as const) {
      const href = buildTestHref("DA40", { length: 10, mode });
      expect(href).not.toContain("minutes");
    }
    expect(buildTestHref("DA40", { length: 10, mode: "exam" })).toBe(
      "/type-rating/DA40/test?questions=10&mode=exam",
    );
  });

  it("means the mode alone decides the clock", () => {
    const href = buildTestHref("DA40", { length: 20, mode: "exam" });
    const query = new URLSearchParams(href.split("?")[1] ?? "");
    const mode = parseTestMode(query.get("mode") ?? undefined);
    const length = parseTestLength(query.get("questions") ?? undefined);
    expect(timeLimitFor(mode, length as number)).toBe(20 * 60);
  });
});
