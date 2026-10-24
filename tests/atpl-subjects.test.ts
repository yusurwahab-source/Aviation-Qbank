import { describe, expect, it } from "vitest";

import { ATPL_SUBJECTS, buildAtplRows } from "@/lib/atpl-subjects";

describe("buildAtplRows", () => {
  it("lists all thirteen subjects, in syllabus order, with unique numbers", () => {
    const rows = buildAtplRows([]);
    expect(rows).toHaveLength(13);
    expect(rows.map((row) => row.number)).toEqual([...rows.map((row) => row.number)].sort());
    expect(new Set(rows.map((row) => row.number)).size).toBe(13);
    expect(rows.every((row) => row.live === null)).toBe(true);
  });

  it("makes a subject live only when its bank is active and has questions", () => {
    const rows = buildAtplRows([
      { code: "POF", status: "active", publishedQuestions: 569 },
      { code: "HPL", status: "active", publishedQuestions: 346 },
      { code: "COM", status: "active", publishedQuestions: 300 },
      { code: "MET", status: "active", publishedQuestions: 1400 },
    ]);
    const live = rows.filter((row) => row.live);
    expect(live.map((row) => [row.number, row.live?.code])).toEqual([
      ["040", "HPL"],
      ["050", "MET"],
      ["080", "POF"],
      ["090", "COM"],
    ]);
  });

  it("keeps a subject locked when its bank is empty, coming soon, or absent", () => {
    expect(
      buildAtplRows([{ code: "POF", status: "active", publishedQuestions: 0 }]).find(
        (row) => row.number === "080",
      )?.live,
    ).toBeNull();
    expect(
      buildAtplRows([{ code: "HPL", status: "coming_soon", publishedQuestions: 10 }]).find(
        (row) => row.number === "040",
      )?.live,
    ).toBeNull();
  });

  it("ignores banks that are not an ATPL subject", () => {
    const rows = buildAtplRows([{ code: "XYZ", status: "active", publishedQuestions: 99 }]);
    expect(rows.every((row) => row.live === null)).toBe(true);
    expect(ATPL_SUBJECTS.filter((s) => s.code)).toHaveLength(13);
  });
});
