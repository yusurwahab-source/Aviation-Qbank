import { ROW_FIELDS, type LogbookPage, type RowField } from "../model";
import { EXPORT_DISCLAIMER, exportLines, type ExportLine } from "./table";

/**
 * A PDF laid out like the EASA logbook's own columns: one landscape A4 page
 * per logbook page, the thirteen numbered column groups across the top, the
 * entries, and the three totals lines at the foot — corrected. Written by
 * hand (the PDF needed here is lines and Helvetica text, nothing more), so
 * no library ships to the browser for one button.
 */

const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 15;
const ROW_H = 14;
const FONT = 6.2;
const ROWS_PER_SHEET = 26;

const WIDTHS: Record<RowField, number> = {
  date: 40,
  dep_place: 32,
  dep_time: 26,
  arr_place: 32,
  arr_time: 26,
  aircraft_type: 34,
  registration: 38,
  se: 26,
  me: 26,
  multi_pilot: 28,
  total_time: 30,
  pic_name: 50,
  landings_day: 20,
  landings_night: 20,
  night: 28,
  ifr: 28,
  pic: 30,
  copilot: 30,
  dual: 30,
  instructor: 30,
  fstd_date: 36,
  fstd_type: 30,
  fstd_time: 28,
  remarks: 114,
};

const SUB_LABELS: Record<RowField, string> = {
  date: "dd/mm/yy",
  dep_place: "Place",
  dep_time: "Time",
  arr_place: "Place",
  arr_time: "Time",
  aircraft_type: "Type",
  registration: "Reg",
  se: "SE",
  me: "ME",
  multi_pilot: "",
  total_time: "",
  pic_name: "",
  landings_day: "Day",
  landings_night: "Night",
  night: "Night",
  ifr: "IFR",
  pic: "PIC",
  copilot: "Co-pilot",
  dual: "Dual",
  instructor: "Instr",
  fstd_date: "Date",
  fstd_type: "Type",
  fstd_time: "Total",
  remarks: "",
};

/** The EASA column groups: number, title, and the fields under them. */
const GROUPS: { title: string; fields: RowField[] }[] = [
  { title: "1 DATE", fields: ["date"] },
  { title: "2 DEPARTURE", fields: ["dep_place", "dep_time"] },
  { title: "3 ARRIVAL", fields: ["arr_place", "arr_time"] },
  { title: "4 AIRCRAFT", fields: ["aircraft_type", "registration"] },
  { title: "5 SINGLE PILOT", fields: ["se", "me"] },
  { title: "6 MULTI-PILOT", fields: ["multi_pilot"] },
  { title: "7 TOTAL TIME", fields: ["total_time"] },
  { title: "8 NAME PIC", fields: ["pic_name"] },
  { title: "9 LANDINGS", fields: ["landings_day", "landings_night"] },
  { title: "10 OP. CONDITION", fields: ["night", "ifr"] },
  { title: "11 PILOT FUNCTION TIME", fields: ["pic", "copilot", "dual", "instructor"] },
  { title: "12 FSTD SESSION", fields: ["fstd_date", "fstd_type", "fstd_time"] },
  { title: "13 REMARKS", fields: ["remarks"] },
];

const TOTAL_LABELS = {
  this_page: "TOTAL THIS PAGE",
  previous_pages: "TOTAL FROM PREVIOUS PAGES",
  total_time: "TOTAL TIME",
} as const;

/** PDF strings are bytes in WinAnsi; anything outside Latin-1 becomes "?". */
function pdfText(text: string): string {
  const mapped = text.replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  let out = "";
  for (const ch of mapped) {
    const code = ch.charCodeAt(0);
    const safe = code >= 0x20 && code <= 0xff && code !== 0x7f ? ch : "?";
    out += safe === "(" || safe === ")" || safe === "\\" ? `\\${safe}` : safe;
  }
  return out;
}

/** Fits text in a width, assuming Helvetica's average glyph is half its size. */
function fit(text: string, width: number, size: number): string {
  const max = Math.max(1, Math.floor((width - 3) / (size * 0.5)));
  return text.length > max ? `${text.slice(0, max - 1)}.` : text;
}

function textAt(x: number, y: number, text: string, size = FONT, bold = false): string {
  return `BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${pdfText(text)}) Tj ET\n`;
}

function sheet(lines: ExportLine[], title: string, sheetNumber: number, sheetCount: number): string {
  let ops = "0.5 w 0 0 0 RG\n";
  const top = PAGE_H - MARGIN;
  ops += textAt(MARGIN, top - 10, title, 9, true);
  ops += textAt(PAGE_W - MARGIN - 70, top - 10, `Sheet ${sheetNumber} of ${sheetCount}`, 7);

  const x0 = MARGIN;
  let y = top - 20;
  const positions = new Map<RowField, number>();
  let x = x0;
  for (const field of ROW_FIELDS) {
    positions.set(field, x);
    x += WIDTHS[field];
  }
  const tableW = x - x0;

  // Header: group titles, then sub-labels, on a light fill.
  ops += `0.92 g ${x0} ${y - 2 * ROW_H} ${tableW} ${2 * ROW_H} re f 0 g\n`;
  for (const group of GROUPS) {
    const gx = positions.get(group.fields[0])!;
    const gw = group.fields.reduce((sum, field) => sum + WIDTHS[field], 0);
    ops += textAt(gx + 2, y - 9, fit(group.title, gw, 5.5), 5.5, true);
    ops += `${gx} ${y - 2 * ROW_H} ${gw} ${2 * ROW_H} re S\n`;
  }
  y -= ROW_H;
  for (const field of ROW_FIELDS) {
    const fx = positions.get(field)!;
    if (SUB_LABELS[field]) {
      ops += textAt(fx + 2, y - 9, fit(SUB_LABELS[field], WIDTHS[field], 5.5), 5.5);
      ops += `${fx} ${y - ROW_H} ${WIDTHS[field]} ${ROW_H} re S\n`;
    }
  }
  y -= ROW_H;

  // On a totals line the label spans the left page's descriptive columns,
  // the way the printed logbook places it.
  const labelFields: RowField[] = ["date", "dep_place", "dep_time", "arr_place", "arr_time", "aircraft_type", "registration"];
  const labelW = labelFields.reduce((sum, field) => sum + WIDTHS[field], 0);

  for (const line of lines) {
    if (line.kind === "total") {
      ops += `0.95 g ${x0} ${y - ROW_H} ${tableW} ${ROW_H} re f 0 g\n`;
      ops += `${x0} ${y - ROW_H} ${labelW} ${ROW_H} re S\n`;
      ops += textAt(x0 + 2, y - 9.5, TOTAL_LABELS[line.line], FONT, true);
    }
    for (const field of ROW_FIELDS) {
      if (line.kind === "total" && labelFields.includes(field)) continue;
      const fx = positions.get(field)!;
      ops += `${fx} ${y - ROW_H} ${WIDTHS[field]} ${ROW_H} re S\n`;
      const value = line.cells[field];
      if (value !== null && value !== undefined && value !== "") {
        ops += textAt(fx + 2, y - 9.5, fit(String(value), WIDTHS[field], FONT), FONT, line.kind === "total");
      }
    }
    y -= ROW_H;
  }

  ops += textAt(MARGIN, MARGIN + 2, EXPORT_DISCLAIMER, 7);
  return ops;
}

export function toPdf(pages: LogbookPage[], name: string): Uint8Array {
  const lines = exportLines(pages);

  // One or more sheets per logbook page, never mixing two pages on a sheet.
  const sheets: { title: string; lines: ExportLine[] }[] = [];
  pages.forEach((_, p) => {
    const pageLines = lines.filter((line) => line.page === p + 1);
    const rows = pageLines.filter((line) => line.kind === "row");
    const totals = pageLines.filter((line) => line.kind === "total");
    for (let i = 0; i === 0 || i < rows.length; i += ROWS_PER_SHEET) {
      const chunk = rows.slice(i, i + ROWS_PER_SHEET);
      const last = i + ROWS_PER_SHEET >= rows.length;
      sheets.push({ title: `${name} - logbook page ${p + 1}`, lines: last ? [...chunk, ...totals] : chunk });
    }
  });
  if (sheets.length === 0) sheets.push({ title: name, lines: [] });

  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const catalog = add("");
  const pagesId = add("");
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const bold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pageIds: number[] = [];
  sheets.forEach((s, i) => {
    const content = sheet(s.lines, s.title, i + 1, sheets.length);
    const contentId = add(`<< /Length ${content.length} >>\nstream\n${content}endstream`);
    pageIds.push(
      add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    );
  });
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  // Every character above is a single byte by construction.
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i += 1) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}
