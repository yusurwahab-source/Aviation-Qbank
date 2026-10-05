import {
  TOTALED_FIELDS,
  emptyPage,
  emptyRow,
  type LogbookPage,
  type LogbookRow,
  type TotaledField,
  type TotalsLine,
} from "@/lib/logbook/model";
import { parseClock, parseDuration } from "@/lib/logbook/time";

/**
 * Builders for logbook fixtures, written the way a pilot writes the page:
 * times as "1:30", clocks as "09:05". Every helper returns minutes, so a
 * fixture reads like the logbook and asserts like the engine.
 */

type RowSpec = {
  date?: string;
  dep?: string;
  depTime?: string;
  arr?: string;
  arrTime?: string;
  type?: string;
  reg?: string;
  total?: string;
  se?: string;
  me?: string;
  pic?: string;
  dual?: string;
  copilot?: string;
  instructor?: string;
  night?: string;
  ifr?: string;
  picName?: string;
  ldgDay?: number;
  ldgNight?: number;
  struck?: boolean;
};

const d = (value: string | undefined) => (value === undefined ? null : parseDuration(value));

export function flight(spec: RowSpec): LogbookRow {
  return {
    ...emptyRow(),
    date: spec.date ?? "01/03/24",
    dep_place: spec.dep ?? "LKBE",
    dep_time: spec.depTime ? parseClock(spec.depTime) : null,
    arr_place: spec.arr ?? "LKBE",
    arr_time: spec.arrTime ? parseClock(spec.arrTime) : null,
    aircraft_type: spec.type ?? "C152",
    registration: spec.reg ?? "OK-ABC",
    se: d(spec.se ?? spec.total),
    me: d(spec.me),
    total_time: d(spec.total),
    pic_name: spec.picName ?? "SELF",
    landings_day: spec.ldgDay ?? 1,
    landings_night: spec.ldgNight ?? null,
    night: d(spec.night),
    ifr: d(spec.ifr),
    pic: d(spec.pic ?? (spec.dual || spec.copilot ? undefined : spec.total)),
    copilot: d(spec.copilot),
    dual: d(spec.dual),
    instructor: d(spec.instructor),
    struck_through: spec.struck ?? false,
  };
}

/** A page whose three totals lines are exactly right for its rows, given
 * what was brought forward. Tests then break one number on purpose. */
export function correctPage(rows: LogbookRow[], broughtForward: TotalsLine | null = null): LogbookPage {
  const page = emptyPage();
  page.rows = rows;
  const thisPage = {} as TotalsLine;
  const previous = {} as TotalsLine;
  const total = {} as TotalsLine;
  for (const field of TOTALED_FIELDS) {
    const counted = rows.filter((row) => !row.struck_through);
    const any = counted.some((row) => row[field] !== null);
    const sum = counted.reduce((acc, row) => acc + (row[field] ?? 0), 0);
    const prev = broughtForward?.[field] ?? 0;
    const printedAny = any || prev > 0;
    thisPage[field] = printedAny ? sum : null;
    previous[field] = printedAny ? prev : null;
    total[field] = printedAny ? prev + sum : null;
  }
  page.printed_totals = { this_page: thisPage, previous_pages: previous, total_time: total };
  return page;
}

/** A run of correct pages, each carrying the last one's total forward. */
export function correctLogbook(pageCount: number, rowsPerPage: (pageIndex: number) => LogbookRow[]) {
  const pages: LogbookPage[] = [];
  for (let p = 0; p < pageCount; p += 1) {
    pages.push(correctPage(rowsPerPage(p), p === 0 ? null : pages[p - 1].printed_totals.total_time));
  }
  return pages;
}

export function minutes(value: string): number {
  const parsed = parseDuration(value);
  if (parsed === null) throw new Error(`Bad duration in fixture: ${value}`);
  return parsed;
}

export function setTotal(page: LogbookPage, line: keyof LogbookPage["printed_totals"], field: TotaledField, value: string) {
  page.printed_totals[line][field] = minutes(value);
}
