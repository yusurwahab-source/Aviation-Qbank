import { describe, expect, it } from "vitest";

import { emptyPage } from "@/lib/logbook/model";
import { applyFix, computeRunningTotals, validateLogbook } from "@/lib/logbook/validate";

import { correctLogbook, correctPage, flight, minutes, setTotal } from "./fixtures/logbook";

const errors = (pages: Parameters<typeof validateLogbook>[0]) =>
  validateLogbook(pages).findings.filter((f) => f.severity === "error");

function dated(day: number, month = 3) {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/24`;
}

describe("validateLogbook — a correct logbook", () => {
  it("finds nothing wrong on a page that adds up", () => {
    const page = correctPage([
      flight({ date: dated(1), total: "1:10", depTime: "09:00", arrTime: "10:10" }),
      flight({ date: dated(2), total: "0:55", depTime: "11:00", arrTime: "11:55" }),
    ]);
    const result = validateLogbook([page]);
    expect(result.counts).toEqual({ error: 0, warning: 0, info: 0 });
  });

  it("carries forward correctly across 14 pages and recomputes the same running total", () => {
    // 14 pages × 6 flights, each 1:05 → 6:30 a page; landing counts too.
    const pages = correctLogbook(14, (p) =>
      Array.from({ length: 6 }, (_, r) =>
        flight({ date: dated(1 + ((p * 6 + r) % 28), 1 + Math.floor((p * 6 + r) / 28)), total: "1:05", ldgDay: 2 }),
      ),
    );

    const result = validateLogbook(pages);
    expect(result.findings.filter((f) => f.severity !== "info")).toEqual([]);

    const last = result.running[13];
    expect(last.total.total_time).toBe(14 * 6 * 65);
    expect(last.total.landings_day).toBe(14 * 6 * 2);
    expect(pages[13].printed_totals.total_time.total_time).toBe(last.total.total_time);
    // Every page's corrected carry-in is the previous page's corrected total.
    for (let p = 1; p < 14; p += 1) {
      expect(result.running[p].previous.pic).toBe(result.running[p - 1].total.pic);
    }
  });

  it("starts the running total from the first page's brought-forward", () => {
    const pages = correctLogbook(2, () => [flight({ total: "1:00" })]);
    pages[0].printed_totals.previous_pages.total_time = minutes("100:00");
    pages[0].printed_totals.total_time.total_time = minutes("101:00");
    pages[1].printed_totals.previous_pages.total_time = minutes("101:00");
    pages[1].printed_totals.total_time.total_time = minutes("102:00");

    const running = computeRunningTotals(pages);
    expect(running[1].total.total_time).toBe(minutes("102:00"));
    expect(errors(pages).filter((f) => f.field === "total_time")).toEqual([]);
  });
});

describe("validateLogbook — page sums (checks 1, 3 and 9)", () => {
  it("catches a missed hour in a page total", () => {
    const page = correctPage([
      flight({ total: "1:40" }),
      flight({ total: "1:35" }),
      flight({ total: "1:15" }),
    ]); // 4:30 — but written as 3:30, the carried hour forgotten.
    setTotal(page, "this_page", "total_time", "3:30");
    setTotal(page, "total_time", "total_time", "3:30");

    const finding = errors([page]).find((f) => f.check === "page-sum" && f.field === "total_time");
    expect(finding).toBeDefined();
    expect(finding!.message).toContain("exactly one hour");
    expect(finding!.fix?.value).toBe(minutes("4:30"));

    // Accepting the fix clears the page-sum finding; the total-time line,
    // which was copied from the wrong figure, is still flagged.
    const fixed = applyFix([page], finding!.fix!);
    const after = errors(fixed);
    expect(after.some((f) => f.check === "page-sum" && f.field === "total_time")).toBe(false);
    expect(after.some((f) => f.check === "running-total" && f.field === "total_time")).toBe(true);
  });

  it("points at the one flight that was left out of the page sum", () => {
    const page = correctPage([
      flight({ total: "1:00" }),
      flight({ total: "1:20" }),
      flight({ total: "0:50" }),
    ]);
    setTotal(page, "this_page", "total_time", "1:50"); // 1:20 never added

    const findings = validateLogbook([page]).findings;
    const missed = findings.find((f) => f.check === "row-not-in-sum");
    expect(missed?.row).toBe(1);
    expect(missed?.message).toContain("1:20");
  });

  it("checks total time = previous + this page", () => {
    const page = correctPage([flight({ total: "1:00" })]);
    setTotal(page, "previous_pages", "total_time", "10:00");
    setTotal(page, "total_time", "total_time", "12:00");

    const finding = errors([page]).find((f) => f.check === "running-total");
    expect(finding?.cell).toEqual({ kind: "total", page: 0, line: "total_time", field: "total_time" });
    expect(finding?.message).toContain("11:00");
  });

  it("ignores struck-through rows in every sum", () => {
    const page = correctPage([flight({ total: "1:00" }), flight({ total: "2:00", struck: true })]);
    expect(page.printed_totals.this_page.total_time).toBe(60);
    expect(errors([page])).toEqual([]);
    expect(validateLogbook([page]).findings.some((f) => f.check === "struck-through")).toBe(true);
  });
});

describe("validateLogbook — carry-forward (check 2)", () => {
  it("flags only the page whose brought-forward differs from the previous page's total", () => {
    const pages = correctLogbook(14, () => [flight({ total: "1:00" }), flight({ total: "0:30" })]);
    // Page 8 (index 7) copies 10:30 as 10:20, and everything after it
    // carries the mistake along consistently.
    for (let p = 7; p < 14; p += 1) {
      pages[p].printed_totals.previous_pages.total_time! -= 10;
      pages[p].printed_totals.total_time.total_time! -= 10;
    }

    const carry = errors(pages).filter((f) => f.check === "carry-forward");
    expect(carry.map((f) => f.page)).toEqual([7]);
    expect(carry[0].fix?.value).toBe(minutes("10:30"));

    const running = computeRunningTotals(pages);
    expect(running[13].total.total_time).toBe(14 * 90);
  });
});

describe("validateLogbook — row checks", () => {
  it("catches arrival before departure", () => {
    const page = correctPage([flight({ total: "1:00", depTime: "14:00", arrTime: "13:00" })]);
    const finding = errors([page]).find((f) => f.check === "arrival-before-departure");
    expect(finding?.cell).toEqual({ kind: "row", page: 0, row: 0, field: "arr_time" });
  });

  it("reads a flight past midnight as an overnight flight, not an error", () => {
    const page = correctPage([flight({ total: "1:00", depTime: "23:30", arrTime: "00:30" })]);
    const finding = validateLogbook([page]).findings.find((f) => f.check === "arrival-before-departure");
    expect(finding?.severity).toBe("info");
  });

  it("flags a block-time mismatch over five minutes, and not one within it", () => {
    const off = correctPage([flight({ total: "1:00", depTime: "09:00", arrTime: "10:20" })]);
    const offFinding = validateLogbook([off]).findings.find((f) => f.check === "block-time");
    expect(offFinding?.severity).toBe("warning");
    expect(offFinding?.fix?.value).toBe(80);

    const close = correctPage([flight({ total: "1:00", depTime: "09:00", arrTime: "10:05" })]);
    expect(validateLogbook([close]).findings.some((f) => f.check === "block-time")).toBe(false);
  });

  it("flags a flight with total time but no function time", () => {
    const row = flight({ total: "1:15" });
    row.pic = null;
    const page = correctPage([row]);
    const finding = errors([page]).find((f) => f.check === "no-function-time");
    expect(finding?.fix?.cell).toEqual({ kind: "row", page: 0, row: 0, field: "pic" });
    expect(finding?.fix?.value).toBe(75);
  });

  it("flags a row whose function times do not add up to its total", () => {
    const page = correctPage([flight({ total: "1:15", pic: "1:05" })]);
    const finding = errors([page]).find((f) => f.check === "row-function-split");
    expect(finding?.fix?.value).toBe(75);
  });

  it("accepts an instructor logging the same flight as PIC and instructor", () => {
    const page = correctPage([flight({ total: "1:00", pic: "1:00", instructor: "1:00" })]);
    expect(errors([page]).filter((f) => f.check.endsWith("function-split"))).toEqual([]);
  });

  it("flags a page whose function totals do not equal its total-time total", () => {
    const page = correctPage([flight({ total: "1:00" })]);
    setTotal(page, "this_page", "pic", "0:50");
    expect(errors([page]).some((f) => f.check === "page-function-split")).toBe(true);
  });

  it("warns about missing data and dates out of order", () => {
    const page = correctPage([
      flight({ date: "05/03/24" }),
      flight({ date: "04/03", total: "1:00" }),
      { ...flight({ total: "1:00" }), registration: null },
    ]);
    const findings = validateLogbook([page]).findings;
    expect(findings.find((f) => f.check === "date-order")?.row).toBe(1);
    expect(findings.find((f) => f.check === "missing-data")?.field).toBe("registration");
  });

  it("turns low-confidence readings into 'please verify' warnings", () => {
    const row = flight({ total: "1:00" });
    row.confidence = { registration: "low", dep_place: "medium" };
    const page = correctPage([row]);
    page.totals_confidence = { "this_page.pic": "low" };
    const findings = validateLogbook([page]).findings.filter((f) => f.check === "low-confidence");
    expect(findings.map((f) => f.severity).sort()).toEqual(["info", "warning", "warning"]);
  });
});

describe("validateLogbook — stability", () => {
  it("gives the same finding the same id on every run, so an ignore survives edits", () => {
    const page = correctPage([flight({ total: "1:00" })]);
    setTotal(page, "this_page", "total_time", "2:00");
    const first = validateLogbook([page]).findings.map((f) => f.id);
    const second = validateLogbook([structuredClone(page)]).findings.map((f) => f.id);
    expect(second).toEqual(first);
  });

  it("handles an empty page without throwing", () => {
    expect(validateLogbook([emptyPage()]).counts.error).toBe(0);
  });
});
