import { crc32 as nodeCrc32 } from "node:zlib";

import { describe, expect, it } from "vitest";

import { toCsv } from "@/lib/logbook/export/csv";
import { toJson } from "@/lib/logbook/export/json";
import { toPdf } from "@/lib/logbook/export/pdf";
import { EXPORT_DISCLAIMER, exportLines } from "@/lib/logbook/export/table";
import { toXlsx } from "@/lib/logbook/export/xlsx";
import { crc32, zipStore } from "@/lib/logbook/export/zip";

import { correctLogbook, flight, setTotal } from "./fixtures/logbook";

const pages = correctLogbook(2, (p) => [
  flight({ date: `0${p + 1}/03/24`, total: "1:30", reg: "OK-ABC", depTime: "09:00", arrTime: "10:30" }),
  flight({ date: `0${p + 1}/03/24`, total: "0:45", struck: true }),
  { ...flight({ total: "1:00" }), remarks: 'Cross-wind, "gusty" (25kt)' },
]);
setTotal(pages[0], "this_page", "total_time", "1:30"); // wrong on paper

describe("logbook exports", () => {
  it("draws every export from corrected totals and leaves struck lines out", () => {
    const lines = exportLines(pages);
    expect(lines.filter((l) => l.kind === "row")).toHaveLength(4);
    const firstTotal = lines.find((l) => l.kind === "total" && l.page === 1 && l.line === "this_page");
    expect(firstTotal?.cells.total_time).toBe("2:30");
    const lastTotal = lines.findLast((l) => l.kind === "total");
    expect(lastTotal?.cells.total_time).toBe("5:00");
  });

  it("writes a CSV that starts with the disclaimer and quotes awkward text", () => {
    const csv = toCsv(pages);
    expect(csv.startsWith("﻿" + EXPORT_DISCLAIMER)).toBe(true);
    expect(csv).toContain('"Cross-wind, ""gusty"" (25kt)"');
  });

  it("writes JSON with the disclaimer and minutes", () => {
    const json = JSON.parse(toJson(pages, "Test"));
    expect(json.disclaimer).toBe(EXPORT_DISCLAIMER);
    expect(json.pages[0].rows[0].total_time).toBe(90);
    expect(json.pages[1].correctedTotals.total.total_time).toBe(300);
  });

  it("computes the same CRC-32 as zlib", () => {
    const data = new TextEncoder().encode("PilotQBank logbook");
    expect(crc32(data)).toBe(nodeCrc32(data));
  });

  it("writes a structurally valid zip for the xlsx", () => {
    const zip = zipStore([{ name: "a.txt", data: new TextEncoder().encode("hello") }]);
    const view = new DataView(zip.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50);

    const xlsx = toXlsx(pages);
    const text = new TextDecoder().decode(xlsx);
    expect(text).toContain("xl/worksheets/sheet1.xml");
    expect(text).toContain(EXPORT_DISCLAIMER);
    expect(text).toContain("&quot;gusty&quot;");
  });

  it("writes a PDF with one sheet per logbook page and the disclaimer on each", () => {
    const pdf = new TextDecoder("latin1").decode(toPdf(pages, "My logbook"));
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("/Count 2");
    expect(pdf.split(EXPORT_DISCLAIMER).length - 1).toBe(2);
    expect(pdf).toContain("11 PILOT FUNCTION TIME");
    expect(pdf).toContain("\\(25kt\\)");
    // The xref offset points at the xref table.
    const startxref = Number(/startxref\n(\d+)/.exec(pdf)![1]);
    expect(pdf.slice(startxref, startxref + 4)).toBe("xref");
  });
});
