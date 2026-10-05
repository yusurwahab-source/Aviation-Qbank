import {
  TOTALED_FIELDS,
  TOTALS_LINES,
  isBlankRow,
  type LogbookPage,
  type RowField,
  type TotaledField,
  type TotalsLineKey,
} from "./model";
import { dayNumber, parseLogDate } from "./time";
import { computeRunningTotals } from "./validate";

/**
 * What a student gets once the logbook is verified: the totals dashboard
 * and the page-by-page guide to correcting the paper. Pure and tested, like
 * the validation engine it builds on.
 */

export type LogbookSummary = {
  /** Brought forward from before the first scanned page, per column. */
  broughtForward: Record<TotaledField, number>;
  /** Grand totals: brought forward + every counted row. */
  totals: Record<TotaledField, number>;
  crossCountry: {
    total: number;
    pic: number;
    dual: number;
    vfr: number;
    ifr: number;
  };
  byType: { type: string; minutes: number; flights: number }[];
  /** Landings dated within the 90 days up to and including `asOf`. */
  last90Days: { day: number; night: number; from: string; to: string };
  flights: number;
};

function iso(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

export function summarize(pages: LogbookPage[], asOf: Date = new Date()): LogbookSummary {
  const running = computeRunningTotals(pages);
  const broughtForward = running[0]?.previous ?? zero();
  const totals = running.at(-1)?.total ?? zero();

  const crossCountry = { total: 0, pic: 0, dual: 0, vfr: 0, ifr: 0 };
  const byType = new Map<string, { minutes: number; flights: number }>();
  const today = Math.floor(asOf.getTime() / 86_400_000);
  const windowStart = today - 89;
  const last90Days = { day: 0, night: 0, from: iso(windowStart), to: iso(today) };
  let flights = 0;
  let year: number | undefined;

  for (const page of pages) {
    for (const row of page.rows) {
      if (row.struck_through || isBlankRow(row)) continue;
      const date = parseLogDate(row.date, year);
      if (date) year = date.year;

      const total = row.total_time ?? 0;
      if (total > 0) flights += 1;

      const dep = row.dep_place?.trim().toUpperCase();
      const arr = row.arr_place?.trim().toUpperCase();
      if (total > 0 && dep && arr && dep !== arr) {
        const ifr = Math.min(row.ifr ?? 0, total);
        crossCountry.total += total;
        crossCountry.pic += row.pic ?? 0;
        crossCountry.dual += row.dual ?? 0;
        crossCountry.ifr += ifr;
        crossCountry.vfr += total - ifr;
      }

      const type = row.aircraft_type?.trim().toUpperCase();
      if (type && total > 0) {
        const entry = byType.get(type) ?? { minutes: 0, flights: 0 };
        entry.minutes += total;
        entry.flights += 1;
        byType.set(type, entry);
      }

      if (date) {
        const n = dayNumber(date);
        if (n >= windowStart && n <= today) {
          last90Days.day += row.landings_day ?? 0;
          last90Days.night += row.landings_night ?? 0;
        }
      }
    }
  }

  return {
    broughtForward,
    totals,
    crossCountry,
    byType: [...byType.entries()]
      .map(([type, value]) => ({ type, ...value }))
      .sort((a, b) => b.minutes - a.minutes),
    last90Days,
    flights,
  };
}

function zero(): Record<TotaledField, number> {
  return Object.fromEntries(TOTALED_FIELDS.map((field) => [field, 0])) as Record<TotaledField, number>;
}

export type PaperCorrection =
  | {
      kind: "row";
      row: number;
      field: RowField;
      old: number | string | null;
      value: number | string | null;
    }
  | {
      kind: "total";
      line: TotalsLineKey;
      field: TotaledField;
      old: number | null;
      value: number;
    };

/**
 * Every cell on the paper that has to be rewritten, page by page.
 *
 * Rows: whatever the student changed on the review screen against what was
 * read off the photo (`original`). Totals lines: whatever is printed against
 * the corrected running total — which covers a wrong page sum and every
 * carry-forward downstream of it, since a fix on page 3 changes what page 4
 * should bring forward.
 */
export function paperCorrections(
  original: LogbookPage[],
  current: LogbookPage[],
): PaperCorrection[][] {
  const running = computeRunningTotals(current);

  return current.map((page, p) => {
    const out: PaperCorrection[] = [];
    const before = original[p];

    page.rows.forEach((row, r) => {
      const was = before?.rows[r];
      if (!was || row.struck_through) return;
      for (const field of Object.keys(row) as (keyof typeof row)[]) {
        if (field === "confidence" || field === "struck_through") continue;
        const value = row[field] as number | string | null;
        const old = was[field] as number | string | null;
        if ((value ?? "") !== (old ?? "")) out.push({ kind: "row", row: r, field, old, value });
      }
    });

    const corrected: Record<TotalsLineKey, Record<TotaledField, number>> = {
      this_page: running[p].thisPage,
      previous_pages: running[p].previous,
      total_time: running[p].total,
    };
    for (const line of TOTALS_LINES) {
      for (const field of TOTALED_FIELDS) {
        // As printed on paper — the photo's own reading, not anything the
        // student typed over it on the review screen.
        const printed = (before ?? page).printed_totals[line][field];
        const value = corrected[line][field];
        if (printed === null && value === 0) continue;
        if (printed !== value) out.push({ kind: "total", line, field, old: printed, value });
      }
    }
    return out;
  });
}
