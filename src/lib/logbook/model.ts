/**
 * The shape of a scanned EASA logbook, after extraction and before anything
 * is checked. Pure data — no database, no React — shared by the extraction
 * route, the validation engine, the review screen and every export.
 *
 * Field names follow the EASA logbook's own columns (FCL.050 / AMC1
 * FCL.050), snake_case because the same names are the JSON the model is
 * asked to return and the JSON a student exports.
 *
 * **Every time is stored as whole minutes.** Durations (`total_time`, `pic`
 * …) are minutes of flight; clock times (`dep_time`, `arr_time`) are minutes
 * after midnight. Landings are plain counts. Text is kept exactly as
 * transcribed — dates included — and interpreted only where a check needs
 * it (`time.ts`), never rewritten on the way in.
 */

/** Durations a printed totals line carries, plus the two landing counts. */
export const DURATION_FIELDS = [
  "se",
  "me",
  "multi_pilot",
  "total_time",
  "night",
  "ifr",
  "pic",
  "copilot",
  "dual",
  "instructor",
  "fstd_time",
] as const;
export type DurationField = (typeof DURATION_FIELDS)[number];

export const LANDING_FIELDS = ["landings_day", "landings_night"] as const;
export type LandingField = (typeof LANDING_FIELDS)[number];

/** Every column the logbook prints a "total this page" for. */
export const TOTALED_FIELDS = [
  "se",
  "me",
  "multi_pilot",
  "total_time",
  "landings_day",
  "landings_night",
  "night",
  "ifr",
  "pic",
  "copilot",
  "dual",
  "instructor",
  "fstd_time",
] as const;
export type TotaledField = (typeof TOTALED_FIELDS)[number];

export const CLOCK_FIELDS = ["dep_time", "arr_time"] as const;
export type ClockField = (typeof CLOCK_FIELDS)[number];

export const TEXT_FIELDS = [
  "date",
  "dep_place",
  "arr_place",
  "aircraft_type",
  "registration",
  "pic_name",
  "fstd_date",
  "fstd_type",
  "remarks",
] as const;
export type TextField = (typeof TEXT_FIELDS)[number];

/** The pilot function columns (EASA column 11), which together must equal
 * the total time of a flight. */
export const FUNCTION_FIELDS = ["pic", "copilot", "dual", "instructor"] as const;

/** Every row field in the order the logbook prints them, left page then right. */
export const ROW_FIELDS = [
  "date",
  "dep_place",
  "dep_time",
  "arr_place",
  "arr_time",
  "aircraft_type",
  "registration",
  "se",
  "me",
  "multi_pilot",
  "total_time",
  "pic_name",
  "landings_day",
  "landings_night",
  "night",
  "ifr",
  "pic",
  "copilot",
  "dual",
  "instructor",
  "fstd_date",
  "fstd_type",
  "fstd_time",
  "remarks",
] as const;
export type RowField = (typeof ROW_FIELDS)[number];

export type FieldKind = "duration" | "count" | "clock" | "text";

export function fieldKind(field: RowField): FieldKind {
  if ((DURATION_FIELDS as readonly string[]).includes(field)) return "duration";
  if ((LANDING_FIELDS as readonly string[]).includes(field)) return "count";
  if ((CLOCK_FIELDS as readonly string[]).includes(field)) return "clock";
  return "text";
}

/** Short column headings, for the review table and the exports. */
export const FIELD_LABELS: Record<RowField, string> = {
  date: "Date",
  dep_place: "Dep",
  dep_time: "Dep time",
  arr_place: "Arr",
  arr_time: "Arr time",
  aircraft_type: "Type",
  registration: "Reg",
  se: "SE",
  me: "ME",
  multi_pilot: "Multi-pilot",
  total_time: "Total",
  pic_name: "PIC name",
  landings_day: "Ldg day",
  landings_night: "Ldg night",
  night: "Night",
  ifr: "IFR",
  pic: "PIC",
  copilot: "Co-pilot",
  dual: "Dual",
  instructor: "Instructor",
  fstd_date: "FSTD date",
  fstd_type: "FSTD type",
  fstd_time: "FSTD time",
  remarks: "Remarks",
};

export type Confidence = "high" | "medium" | "low";

export type LogbookRow = {
  [F in TextField]: string | null;
} & {
  [F in ClockField]: number | null;
} & {
  [F in DurationField]: number | null;
} & {
  [F in LandingField]: number | null;
} & {
  /** Crossed out on paper. Kept so the review mirrors the page, ignored by
   * every sum. */
  struck_through: boolean;
  /** Only the fields that are *not* high confidence; absent means high. */
  confidence: Partial<Record<RowField, Exclude<Confidence, "high">>>;
};

export type TotalsLine = Record<TotaledField, number | null>;

export const TOTALS_LINES = ["this_page", "previous_pages", "total_time"] as const;
export type TotalsLineKey = (typeof TOTALS_LINES)[number];

export const TOTALS_LINE_LABELS: Record<TotalsLineKey, string> = {
  this_page: "Total this page",
  previous_pages: "Total from previous pages",
  total_time: "Total time",
};

export type PrintedTotals = Record<TotalsLineKey, TotalsLine>;

export type LogbookPage = {
  rows: LogbookRow[];
  printed_totals: PrintedTotals;
  /** Totals cells the model could not read with confidence, keyed
   * `line.field`. */
  totals_confidence: Partial<Record<`${TotalsLineKey}.${TotaledField}`, Exclude<Confidence, "high">>>;
};

export function emptyTotalsLine(): TotalsLine {
  return Object.fromEntries(TOTALED_FIELDS.map((field) => [field, null])) as TotalsLine;
}

export function emptyRow(): LogbookRow {
  return {
    ...(Object.fromEntries(ROW_FIELDS.map((field) => [field, null])) as Record<RowField, null>),
    struck_through: false,
    confidence: {},
  };
}

export function emptyPage(): LogbookPage {
  return {
    rows: [],
    printed_totals: {
      this_page: emptyTotalsLine(),
      previous_pages: emptyTotalsLine(),
      total_time: emptyTotalsLine(),
    },
    totals_confidence: {},
  };
}

/** A row with nothing in it — the blank lines at the foot of a page that a
 * model sometimes returns anyway. A row with only unreadable cells is not
 * blank: its doubtful readings are what the student has to look at. */
export function isBlankRow(row: LogbookRow): boolean {
  return (
    !row.struck_through &&
    Object.keys(row.confidence).length === 0 &&
    ROW_FIELDS.every((field) => row[field] === null || row[field] === "")
  );
}
