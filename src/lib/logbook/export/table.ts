import {
  FIELD_LABELS,
  ROW_FIELDS,
  TOTALED_FIELDS,
  TOTALS_LINE_LABELS,
  fieldKind,
  isBlankRow,
  type LogbookPage,
  type RowField,
  type TotalsLineKey,
} from "../model";
import { formatClock, formatDuration } from "../time";
import { computeRunningTotals } from "../validate";

/**
 * The one table every export is drawn from, so a CSV, a spreadsheet and a
 * PDF of the same logbook can never disagree. Rows are the reviewed entries
 * (crossed-out lines left out); each page closes with its three totals lines
 * as *corrected* — the running total the validation engine recomputed, not
 * the figures on the paper.
 */

export const EXPORT_DISCLAIMER =
  "Generated from your photos. You are responsible for verifying your logbook entries.";

export type ExportCell = string | number | null;

export type ExportLine =
  | { kind: "row"; page: number; row: number; cells: Record<RowField, ExportCell> }
  | { kind: "total"; page: number; line: TotalsLineKey; cells: Partial<Record<RowField, ExportCell>> };

export function displayValue(field: RowField, value: number | string | null): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  const kind = fieldKind(field);
  if (kind === "duration") return formatDuration(value);
  if (kind === "clock") return formatClock(value);
  return String(value);
}

export function exportLines(pages: LogbookPage[]): ExportLine[] {
  const running = computeRunningTotals(pages);
  const out: ExportLine[] = [];
  pages.forEach((page, p) => {
    page.rows.forEach((row, r) => {
      if (row.struck_through || isBlankRow(row)) return;
      const cells = Object.fromEntries(
        ROW_FIELDS.map((field) => [field, displayValue(field, row[field]) || null]),
      ) as Record<RowField, ExportCell>;
      out.push({ kind: "row", page: p + 1, row: r + 1, cells });
    });
    const lines: [TotalsLineKey, Record<string, number>][] = [
      ["this_page", running[p].thisPage],
      ["previous_pages", running[p].previous],
      ["total_time", running[p].total],
    ];
    for (const [line, values] of lines) {
      const cells: Partial<Record<RowField, ExportCell>> = {};
      for (const field of TOTALED_FIELDS) cells[field] = displayValue(field, values[field]);
      out.push({ kind: "total", page: p + 1, line, cells });
    }
  });
  return out;
}

export const EXPORT_HEADERS = ["Page", "Row", ...ROW_FIELDS.map((field) => FIELD_LABELS[field])];

/** A line as an array matching `EXPORT_HEADERS`. */
export function lineToArray(line: ExportLine): ExportCell[] {
  const first: ExportCell[] =
    line.kind === "row" ? [line.page, line.row] : [line.page, TOTALS_LINE_LABELS[line.line]];
  return [...first, ...ROW_FIELDS.map((field) => line.cells[field] ?? null)];
}
