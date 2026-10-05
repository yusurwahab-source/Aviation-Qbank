import {
  FIELD_LABELS,
  FUNCTION_FIELDS,
  TOTALED_FIELDS,
  TOTALS_LINE_LABELS,
  fieldKind,
  isBlankRow,
  type LogbookPage,
  type LogbookRow,
  type RowField,
  type TotaledField,
  type TotalsLine,
  type TotalsLineKey,
} from "./model";
import { dayNumber, formatClock, formatDuration, parseLogDate, type LogDate } from "./time";

/**
 * The validation engine: deterministic code, no AI, pure and unit tested.
 *
 * The model transcribes; it is told never to correct. Everything that
 * decides whether a logbook adds up happens here, over whole minutes, so the
 * same pages always produce the same findings — and a student's own edit on
 * the review screen re-runs exactly this, instantly, in the browser.
 *
 * Struck-through rows are ignored by every check and every sum; that is
 * what crossing a line out on paper means.
 *
 * Page and row numbers in a finding are zero-based indexes; the screen adds
 * one when it prints them.
 */

export type Severity = "error" | "warning" | "info";

export type CheckId =
  | "page-sum"
  | "carry-forward"
  | "running-total"
  | "row-function-split"
  | "page-function-split"
  | "block-time"
  | "arrival-before-departure"
  | "no-function-time"
  | "row-not-in-sum"
  | "missing-data"
  | "date-order"
  | "low-confidence"
  | "struck-through";

export type CellRef =
  | { kind: "row"; page: number; row: number; field: RowField }
  | { kind: "total"; page: number; line: TotalsLineKey; field: TotaledField };

export type SuggestedFix = {
  cell: CellRef;
  /** Minutes, a count, or text — whatever the cell holds. */
  value: number | string | null;
  /** What pressing "Accept fix" will do, in words. */
  label: string;
};

export type Finding = {
  /** Stable across re-validation, so an "Ignore" survives every edit. */
  id: string;
  /** The same, without the page index — what the review screen stores an
   * "Ignore" under, so it survives the student reordering pages too. */
  key: string;
  check: CheckId;
  severity: Severity;
  page: number;
  row: number | null;
  field: string | null;
  /** The cell to colour on the review screen, when there is one. */
  cell: CellRef | null;
  message: string;
  fix: SuggestedFix | null;
};

/** How far apart block time and logged time may be before it is worth a
 * look. Rounding to the nearest five minutes is common practice. */
export const BLOCK_TIME_TOLERANCE_MINUTES = 5;

export type RunningTotals = {
  /** What the rows of this page add up to. */
  thisPage: Record<TotaledField, number>;
  /** The corrected carry-in: the previous page's corrected total, or for the
   * first page whatever it says it brought forward. */
  previous: Record<TotaledField, number>;
  /** previous + thisPage. */
  total: Record<TotaledField, number>;
};

export type ValidationResult = {
  findings: Finding[];
  running: RunningTotals[];
  counts: Record<Severity, number>;
};

function zeroLine(): Record<TotaledField, number> {
  return Object.fromEntries(TOTALED_FIELDS.map((field) => [field, 0])) as Record<TotaledField, number>;
}

function countedRows(page: LogbookPage): { row: LogbookRow; index: number }[] {
  return page.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !row.struck_through && !isBlankRow(row));
}

/** The sum of every counted row, per column. */
export function sumRows(page: LogbookPage): Record<TotaledField, number> {
  const sums = zeroLine();
  for (const { row } of countedRows(page)) {
    for (const field of TOTALED_FIELDS) sums[field] += row[field] ?? 0;
  }
  return sums;
}

/**
 * A corrected running total for every page, built only from the rows: what
 * each page's three totals lines *should* say. The first page's carry-in is
 * the one number the rows cannot supply, so it is taken as printed (a
 * logbook that continues an older one starts with a real brought-forward).
 */
export function computeRunningTotals(pages: LogbookPage[]): RunningTotals[] {
  const out: RunningTotals[] = [];
  pages.forEach((page, index) => {
    const thisPage = sumRows(page);
    const previous = zeroLine();
    for (const field of TOTALED_FIELDS) {
      previous[field] =
        index === 0
          ? (page.printed_totals.previous_pages[field] ?? 0)
          : out[index - 1].total[field];
    }
    const total = zeroLine();
    for (const field of TOTALED_FIELDS) total[field] = previous[field] + thisPage[field];
    out.push({ thisPage, previous, total });
  });
  return out;
}

function show(field: TotaledField | RowField, value: number | null): string {
  if (value === null) return "blank";
  const kind = fieldKind(field as RowField);
  if (kind === "count") return String(value);
  if (kind === "clock") return formatClock(value);
  return formatDuration(value);
}

function functionSum(line: Pick<TotalsLine, "pic" | "copilot" | "dual" | "instructor">) {
  const all = FUNCTION_FIELDS.reduce((sum, field) => sum + (line[field] ?? 0), 0);
  // An instructor commonly logs the same flight as PIC *and* as instructor
  // (AMC1 FCL.050). That is not double counting, so a split is also right
  // when the columns other than instructor already make up the total.
  const withoutInstructor = all - (line.instructor ?? 0);
  return { all, withoutInstructor };
}

function splitMatches(total: number, line: Pick<TotalsLine, "pic" | "copilot" | "dual" | "instructor">) {
  const { all, withoutInstructor } = functionSum(line);
  return all === total || (withoutInstructor === total && (line.instructor ?? 0) > 0);
}

function findingKey(check: CheckId, row: number | null, field: string | null, extra = "") {
  return [check, row ?? "-", field ?? "-", extra].join(":");
}

/** Runs every check over every page. */
export function validateLogbook(pages: LogbookPage[]): ValidationResult {
  const findings: Finding[] = [];
  const running = computeRunningTotals(pages);
  const push = (finding: Omit<Finding, "id" | "key"> & { idExtra?: string }) => {
    const { idExtra, ...rest } = finding;
    const key = findingKey(rest.check, rest.row, rest.field, idExtra);
    findings.push({ id: `${rest.page}:${key}`, key, ...rest });
  };

  let lastDate: { date: LogDate; page: number; row: number } | null = null;

  pages.forEach((page, p) => {
    const printed = page.printed_totals;
    const sums = running[p].thisPage;
    const rows = countedRows(page);

    // ---- Row checks -------------------------------------------------------
    page.rows.forEach((row, r) => {
      if (isBlankRow(row)) return;

      if (row.struck_through) {
        push({
          check: "struck-through",
          severity: "info",
          page: p,
          row: r,
          field: null,
          cell: null,
          message: "This line is crossed out, so it is left out of every total.",
          fix: null,
        });
        return;
      }

      const total = row.total_time;
      const anyFunction = FUNCTION_FIELDS.some((field) => (row[field] ?? 0) > 0);

      // 4. Pilot function time must account for the whole flight.
      if (total !== null && total > 0 && anyFunction && !splitMatches(total, row)) {
        const present = FUNCTION_FIELDS.filter((field) => row[field] !== null && row[field] !== 0);
        const only = present.length === 1 ? present[0] : null;
        push({
          check: "row-function-split",
          severity: "error",
          page: p,
          row: r,
          field: "total_time",
          cell: { kind: "row", page: p, row: r, field: only ?? "total_time" },
          message: `PIC + co-pilot + dual + instructor is ${formatDuration(functionSum(row).all)}, but the total time is ${formatDuration(total)}.`,
          fix: only
            ? {
                cell: { kind: "row", page: p, row: r, field: only },
                value: total,
                label: `Set ${FIELD_LABELS[only]} to ${formatDuration(total)}`,
              }
            : null,
        });
      }

      // 8. A flight with no function time is missing from every function total.
      if (total !== null && total > 0 && !anyFunction) {
        const asPic = row.pic_name !== null && /^\s*self\s*$/i.test(row.pic_name);
        const field = asPic ? "pic" : "dual";
        push({
          check: "no-function-time",
          severity: "error",
          page: p,
          row: r,
          field: "pic",
          cell: { kind: "row", page: p, row: r, field: "pic" },
          message: `${formatDuration(total)} of flight time has no PIC, co-pilot, dual or instructor time, so it is not counted in any of those totals.`,
          fix: {
            cell: { kind: "row", page: p, row: r, field },
            value: total,
            label: asPic
              ? `Log ${formatDuration(total)} as PIC (PIC name is SELF)`
              : `Log ${formatDuration(total)} as dual`,
          },
        });
      }

      // 6 and 7. Block time against logged time.
      if (row.dep_time !== null && row.arr_time !== null) {
        if (row.arr_time < row.dep_time) {
          const overnight = row.arr_time + 1440 - row.dep_time;
          const plausibleOvernight =
            total !== null && Math.abs(overnight - total) <= BLOCK_TIME_TOLERANCE_MINUTES;
          push({
            check: "arrival-before-departure",
            severity: plausibleOvernight ? "info" : "error",
            page: p,
            row: r,
            field: "arr_time",
            cell: { kind: "row", page: p, row: r, field: "arr_time" },
            message: plausibleOvernight
              ? `Arrival ${formatClock(row.arr_time)} is before departure ${formatClock(row.dep_time)} — read as a flight past midnight, which matches the ${formatDuration(total)} logged.`
              : `Arrival ${formatClock(row.arr_time)} is before departure ${formatClock(row.dep_time)}.`,
            fix: null,
          });
        } else if (total !== null) {
          const block = row.arr_time - row.dep_time;
          if (Math.abs(block - total) > BLOCK_TIME_TOLERANCE_MINUTES) {
            push({
              check: "block-time",
              severity: "warning",
              page: p,
              row: r,
              field: "total_time",
              cell: { kind: "row", page: p, row: r, field: "total_time" },
              message: `Departure ${formatClock(row.dep_time)} to arrival ${formatClock(row.arr_time)} is ${formatDuration(block)}, but ${formatDuration(total)} is logged.`,
              fix: {
                cell: { kind: "row", page: p, row: r, field: "total_time" },
                value: block,
                label: `Set total time to ${formatDuration(block)}`,
              },
            });
          }
        }
      }

      // 10. Missing essentials. A simulator session has no places or
      // registration, so it is only asked for a date.
      const isSimulator = row.fstd_time !== null && (row.total_time === null || row.total_time === 0);
      const required: RowField[] = isSimulator
        ? ["date"]
        : ["date", "dep_place", "arr_place", "registration"];
      for (const field of required) {
        if (row[field] === null || row[field] === "") {
          push({
            check: "missing-data",
            severity: "warning",
            page: p,
            row: r,
            field,
            cell: { kind: "row", page: p, row: r, field },
            message: `${FIELD_LABELS[field]} is missing.`,
            fix: null,
          });
        }
      }

      // 10. Chronological order.
      const date = parseLogDate(row.date, lastDate?.date.year);
      if (date) {
        if (lastDate && dayNumber(date) < dayNumber(lastDate.date)) {
          push({
            check: "date-order",
            severity: "warning",
            page: p,
            row: r,
            field: "date",
            cell: { kind: "row", page: p, row: r, field: "date" },
            message: `${row.date} comes before the previous entry's date — entries should be in chronological order.`,
            fix: null,
          });
        }
        lastDate = { date, page: p, row: r };
      }

      // 11. Anything the model could not read with confidence.
      for (const [field, level] of Object.entries(row.confidence) as [RowField, "medium" | "low"][]) {
        push({
          check: "low-confidence",
          severity: level === "low" ? "warning" : "info",
          page: p,
          row: r,
          field,
          cell: { kind: "row", page: p, row: r, field },
          message:
            level === "low"
              ? `${FIELD_LABELS[field]} was hard to read — please verify it against the photo.`
              : `${FIELD_LABELS[field]} may have been misread — worth a glance.`,
          fix: null,
        });
      }
    });

    // ---- Page checks ------------------------------------------------------
    for (const field of TOTALED_FIELDS) {
      const printedThis = printed.this_page[field];
      const computed = sums[field];

      // 1. The rows against the printed "total this page".
      if (printedThis === null) {
        if (computed > 0) {
          push({
            check: "page-sum",
            severity: "warning",
            page: p,
            row: null,
            field,
            cell: { kind: "total", page: p, line: "this_page", field },
            message: `${FIELD_LABELS[field]}: "Total this page" is blank, but the rows add up to ${show(field, computed)}.`,
            fix: {
              cell: { kind: "total", page: p, line: "this_page", field },
              value: computed,
              label: `Fill in ${show(field, computed)}`,
            },
          });
        }
      } else if (printedThis !== computed) {
        const diff = computed - printedThis;
        const isDuration = fieldKind(field) === "duration";
        const hint =
          isDuration && Math.abs(diff) === 60
            ? " — exactly one hour, which usually means an hour was not carried when the minutes passed 60."
            : ".";
        push({
          check: "page-sum",
          severity: "error",
          page: p,
          row: null,
          field,
          cell: { kind: "total", page: p, line: "this_page", field },
          message: `${FIELD_LABELS[field]}: "Total this page" says ${show(field, printedThis)}, but the rows add up to ${show(field, computed)} (${diff > 0 ? "+" : "−"}${show(field, Math.abs(diff))})${hint}`,
          fix: {
            cell: { kind: "total", page: p, line: "this_page", field },
            value: computed,
            label: `Change to ${show(field, computed)}`,
          },
        });

        // 9. A single flight left out of the page's total time.
        if (field === "total_time" && diff > 0) {
          const missed = rows.filter(({ row }) => row.total_time === diff);
          if (missed.length === 1) {
            const r = missed[0].index;
            push({
              check: "row-not-in-sum",
              severity: "warning",
              page: p,
              row: r,
              field: "total_time",
              cell: { kind: "row", page: p, row: r, field: "total_time" },
              message: `This flight's ${formatDuration(diff)} is exactly what the page total is short by — it looks like it was left out when the page was added up.`,
              fix: null,
            });
          }
        }
      }

      // 2. Carry-forward from the previous page.
      const printedPrevious = printed.previous_pages[field];
      if (p > 0 && printedPrevious !== null) {
        const priorPrinted = pages[p - 1].printed_totals.total_time[field];
        const expected = priorPrinted ?? running[p - 1].total[field];
        if (printedPrevious !== expected) {
          push({
            check: "carry-forward",
            severity: "error",
            page: p,
            row: null,
            field,
            cell: { kind: "total", page: p, line: "previous_pages", field },
            message: `${FIELD_LABELS[field]}: "Total from previous pages" is ${show(field, printedPrevious)}, but page ${p} ended on ${show(field, expected)}.`,
            fix: {
              cell: { kind: "total", page: p, line: "previous_pages", field },
              value: running[p - 1].total[field],
              label: `Change to ${show(field, running[p - 1].total[field])} (the corrected total of page ${p})`,
            },
          });
        }
      }

      // 3. Total time = previous + this page.
      const printedTotal = printed.total_time[field];
      if (printedTotal !== null && printedPrevious !== null && printedThis !== null) {
        const expected = printedPrevious + printedThis;
        if (printedTotal !== expected) {
          push({
            check: "running-total",
            severity: "error",
            page: p,
            row: null,
            field,
            cell: { kind: "total", page: p, line: "total_time", field },
            message: `${FIELD_LABELS[field]}: "Total time" is ${show(field, printedTotal)}, but ${show(field, printedPrevious)} + ${show(field, printedThis)} is ${show(field, expected)}.`,
            fix: {
              cell: { kind: "total", page: p, line: "total_time", field },
              value: running[p].total[field],
              label: `Change to ${show(field, running[p].total[field])} (corrected running total)`,
            },
          });
        }
      }
    }

    // 5. The function columns' page total against the total-time column's.
    const pageTotal = printed.this_page.total_time;
    const anyPrintedFunction = FUNCTION_FIELDS.some((field) => printed.this_page[field] !== null);
    if (pageTotal !== null && anyPrintedFunction && !splitMatches(pageTotal, printed.this_page)) {
      push({
        check: "page-function-split",
        severity: "error",
        page: p,
        row: null,
        field: "total_time",
        cell: { kind: "total", page: p, line: "this_page", field: "total_time" },
        message: `"Total this page": PIC + co-pilot + dual + instructor is ${formatDuration(functionSum(printed.this_page).all)}, but total time is ${formatDuration(pageTotal)}.`,
        fix: null,
      });
    }

    // 11. Totals cells read with low confidence.
    for (const [key, level] of Object.entries(page.totals_confidence)) {
      const [line, field] = key.split(".") as [TotalsLineKey, TotaledField];
      push({
        check: "low-confidence",
        severity: level === "low" ? "warning" : "info",
        page: p,
        row: null,
        field,
        idExtra: line,
        cell: { kind: "total", page: p, line, field },
        message: `${TOTALS_LINE_LABELS[line]}, ${FIELD_LABELS[field]}: ${level === "low" ? "hard to read — please verify it against the photo." : "may have been misread."}`,
        fix: null,
      });
    }
  });

  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  return { findings, running, counts };
}

/** Writes a fix's value into a copy of the pages. */
export function applyFix(pages: LogbookPage[], fix: SuggestedFix): LogbookPage[] {
  return setCell(pages, fix.cell, fix.value);
}

export function setCell(pages: LogbookPage[], cell: CellRef, value: number | string | null): LogbookPage[] {
  return pages.map((page, p) => {
    if (p !== cell.page) return page;
    if (cell.kind === "total") {
      const line = { ...page.printed_totals[cell.line], [cell.field]: value as number | null };
      const key = `${cell.line}.${cell.field}` as const;
      const totalsConfidence = { ...page.totals_confidence };
      delete totalsConfidence[key];
      return {
        ...page,
        printed_totals: { ...page.printed_totals, [cell.line]: line },
        totals_confidence: totalsConfidence,
      };
    }
    return {
      ...page,
      rows: page.rows.map((row, r) => {
        if (r !== cell.row) return row;
        // A value the student has typed or accepted is, by definition, no
        // longer a doubtful reading.
        const confidence = { ...row.confidence };
        delete confidence[cell.field];
        return { ...row, [cell.field]: value, confidence };
      }),
    };
  });
}

/** Whether a finding points at this cell — the review table's colouring. */
export function sameCell(a: CellRef | null, b: CellRef): boolean {
  if (!a || a.kind !== b.kind || a.page !== b.page || a.field !== b.field) return false;
  if (a.kind === "row" && b.kind === "row") return a.row === b.row;
  if (a.kind === "total" && b.kind === "total") return a.line === b.line;
  return false;
}
