import type { LogbookPage } from "../model";
import { EXPORT_DISCLAIMER, EXPORT_HEADERS, exportLines, lineToArray, type ExportCell } from "./table";

function csvCell(value: ExportCell): string {
  if (value === null) return "";
  const text = String(value);
  // A leading = + - @ would be run as a formula by a spreadsheet.
  const safe = /^[=+\-@]/.test(text) && !/^-?\d/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV with a byte-order mark so Excel opens it as UTF-8, and the
 * disclaimer as its first line. */
export function toCsv(pages: LogbookPage[]): string {
  const rows = [[EXPORT_DISCLAIMER], [], EXPORT_HEADERS, ...exportLines(pages).map(lineToArray)];
  return "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
