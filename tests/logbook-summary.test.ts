import { describe, expect, it } from "vitest";

import { paperCorrections, summarize } from "@/lib/logbook/summary";
import { setCell } from "@/lib/logbook/validate";

import { correctLogbook, correctPage, flight, minutes, setTotal } from "./fixtures/logbook";

describe("summarize", () => {
  it("totals every column and splits cross-country time", () => {
    const page = correctPage([
      flight({ date: "01/09/26", dep: "LKBE", arr: "LKPR", total: "1:00", ifr: "0:30", ldgDay: 1 }),
      flight({ date: "02/09/26", dep: "LKPR", arr: "LKPR", total: "0:45", dual: "0:45", ldgDay: 3 }),
      flight({ date: "03/09/26", dep: "LKPR", arr: "LKBE", total: "1:15", dual: "1:15", type: "DA40", ldgNight: 1 }),
    ]);
    const summary = summarize([page], new Date("2026-10-05T12:00:00Z"));

    expect(summary.totals.total_time).toBe(180);
    expect(summary.totals.pic).toBe(60);
    expect(summary.totals.dual).toBe(120);
    expect(summary.crossCountry).toEqual({ total: 135, pic: 60, dual: 75, vfr: 105, ifr: 30 });
    expect(summary.byType).toEqual([
      { type: "C152", minutes: 105, flights: 2 },
      { type: "DA40", minutes: 75, flights: 1 },
    ]);
    expect(summary.last90Days.day).toBe(5);
    expect(summary.last90Days.night).toBe(1);
  });

  it("leaves landings older than 90 days out of the recency count", () => {
    const page = correctPage([flight({ date: "01/01/26", ldgDay: 4 }), flight({ date: "01/10/26", ldgDay: 2 })]);
    expect(summarize([page], new Date("2026-10-05T00:00:00Z")).last90Days.day).toBe(2);
  });
});

describe("paperCorrections", () => {
  it("lists the wrong page total and every carry-forward after it", () => {
    const pages = correctLogbook(3, () => [flight({ total: "1:00" })]);
    setTotal(pages[0], "this_page", "total_time", "0:50");
    setTotal(pages[0], "total_time", "total_time", "0:50");
    for (const p of [1, 2]) {
      pages[p].printed_totals.previous_pages.total_time! -= 10;
      pages[p].printed_totals.total_time.total_time! -= 10;
    }
    const corrections = paperCorrections(pages, pages);
    const totalTime = (p: number) =>
      corrections[p].filter((c) => c.kind === "total" && c.field === "total_time").map((c) => [c.kind === "total" && c.line, c.value]);

    expect(totalTime(0)).toEqual([["this_page", 60], ["total_time", 60]]);
    expect(totalTime(1)).toEqual([["previous_pages", 60], ["total_time", 120]]);
    expect(totalTime(2)).toEqual([["previous_pages", 120], ["total_time", 180]]);
  });

  it("lists row cells the student changed", () => {
    const original = [correctPage([flight({ total: "1:00", reg: "OK-ABC" })])];
    const current = setCell(original, { kind: "row", page: 0, row: 0, field: "registration" }, "OK-ABD");
    const [first] = paperCorrections(original, current);
    expect(first).toContainEqual({ kind: "row", row: 0, field: "registration", old: "OK-ABC", value: "OK-ABD" });
    expect(minutes("1:00")).toBe(60);
  });
});
