import { z } from "zod";

import {
  CLOCK_FIELDS,
  DURATION_FIELDS,
  LANDING_FIELDS,
  ROW_FIELDS,
  TEXT_FIELDS,
  TOTALED_FIELDS,
  TOTALS_LINES,
  emptyRow,
  emptyTotalsLine,
  isBlankRow,
  type LogbookPage,
  type LogbookRow,
  type TotalsLine,
} from "./model";
import { parseClock, parseCount, parseDuration } from "./time";

/**
 * What the model is asked to return, and how it becomes a `LogbookPage`.
 * Pure, so the boundary between "what was read" and "what is checked" can be
 * tested without calling anybody's API.
 *
 * Every cell comes back as the **text written on the page** — never a
 * number the model has worked out — and is turned into minutes here. That
 * split is the point: the model transcribes, this file interprets, and
 * `validate.ts` judges.
 */

const cell = z.string().nullable();
const level = z.enum(["medium", "low"]);

const rowShape = Object.fromEntries(ROW_FIELDS.map((field) => [field, cell])) as Record<
  (typeof ROW_FIELDS)[number],
  typeof cell
>;

const totalsLineSchema = z
  .object(
    Object.fromEntries(TOTALED_FIELDS.map((field) => [field, cell])) as Record<
      (typeof TOTALED_FIELDS)[number],
      typeof cell
    >,
  )
  .strict();

/** The schema given to the API as the required output format. */
export const extractedPageSchema = z
  .object({
    rows: z.array(
      z
        .object({
          ...rowShape,
          struck_through: z.boolean(),
          uncertain: z.array(z.object({ field: z.enum(ROW_FIELDS), confidence: level }).strict()),
        })
        .strict(),
    ),
    printed_totals: z
      .object({
        this_page: totalsLineSchema,
        previous_pages: totalsLineSchema,
        total_time: totalsLineSchema,
      })
      .strict(),
    uncertain_totals: z.array(
      z
        .object({ line: z.enum(TOTALS_LINES), field: z.enum(TOTALED_FIELDS), confidence: level })
        .strict(),
    ),
    /** Anything about the photo the student should know: "right page cut
     * off", "not a logbook". Shown on the review screen as-is. */
    photo_note: z.string().nullable(),
  })
  .strict();

export type ExtractedPage = z.infer<typeof extractedPageSchema>;

const DURATION_TEXT = /^\d{0,5}[:.]\d{1,2}$|^\d{1,2}$/;
const CLOCK_TEXT = /^\d{1,2}:?\d{2}$/;

/**
 * The stricter second look: the same data, held to the formats the prompt
 * asked for. A reply that fails it is retried once with the problems listed;
 * a reply that fails twice is still used, with every unreadable value
 * nulled and marked low confidence — the student sees the photo and can
 * type it in, which beats an error screen.
 */
export function formatProblems(page: ExtractedPage): string[] {
  const problems: string[] = [];
  page.rows.forEach((row, r) => {
    for (const field of DURATION_FIELDS) {
      const value = row[field]?.trim();
      if (value && !DURATION_TEXT.test(value)) problems.push(`rows[${r}].${field} = "${value}" is not H:MM`);
    }
    for (const field of CLOCK_FIELDS) {
      const value = row[field]?.trim();
      if (value && !CLOCK_TEXT.test(value)) problems.push(`rows[${r}].${field} = "${value}" is not HH:MM`);
    }
    for (const field of LANDING_FIELDS) {
      const value = row[field]?.trim();
      if (value && !/^\d+$/.test(value)) problems.push(`rows[${r}].${field} = "${value}" is not a whole number`);
    }
  });
  for (const line of TOTALS_LINES) {
    for (const field of TOTALED_FIELDS) {
      const value = page.printed_totals[line][field]?.trim();
      if (!value) continue;
      const ok = (LANDING_FIELDS as readonly string[]).includes(field)
        ? /^\d+$/.test(value)
        : DURATION_TEXT.test(value);
      if (!ok) problems.push(`printed_totals.${line}.${field} = "${value}" is not in the expected format`);
    }
  }
  return problems;
}

function clean(value: string | null): string | null {
  if (value === null) return null;
  const text = value.trim();
  return text === "" ? null : text;
}

/** Turns the model's text into minutes and counts, marking anything that
 * would not parse as a low-confidence blank rather than guessing. */
export function normalizeExtractedPage(page: ExtractedPage): LogbookPage {
  const rows: LogbookRow[] = page.rows.map((source) => {
    const row = emptyRow();
    row.struck_through = source.struck_through;
    for (const item of source.uncertain) row.confidence[item.field] = item.confidence;

    for (const field of TEXT_FIELDS) row[field] = clean(source[field]);
    for (const field of CLOCK_FIELDS) {
      const raw = clean(source[field]);
      row[field] = parseClock(raw);
      if (raw !== null && row[field] === null) row.confidence[field] = "low";
    }
    for (const field of DURATION_FIELDS) {
      const raw = clean(source[field]);
      row[field] = parseDuration(raw);
      if (raw !== null && row[field] === null) row.confidence[field] = "low";
    }
    for (const field of LANDING_FIELDS) {
      const raw = clean(source[field]);
      row[field] = parseCount(raw);
      if (raw !== null && row[field] === null) row.confidence[field] = "low";
    }
    return row;
  });

  const totalsConfidence: LogbookPage["totals_confidence"] = {};
  for (const item of page.uncertain_totals) totalsConfidence[`${item.line}.${item.field}`] = item.confidence;

  const line = (key: (typeof TOTALS_LINES)[number]): TotalsLine => {
    const out = emptyTotalsLine();
    for (const field of TOTALED_FIELDS) {
      const raw = clean(page.printed_totals[key][field]);
      out[field] = (LANDING_FIELDS as readonly string[]).includes(field) ? parseCount(raw) : parseDuration(raw);
      if (raw !== null && out[field] === null) totalsConfidence[`${key}.${field}`] = "low";
    }
    return out;
  };

  // Trailing blank lines are the page's unused space, not entries. Judged
  // on what was written, not on what parsed: a line whose only content was
  // unreadable is still a line the student has to see.
  const writtenOn = page.rows.map(
    (source) => source.struck_through || ROW_FIELDS.some((field) => clean(source[field]) !== null),
  );
  while (rows.length > 0 && !writtenOn[rows.length - 1] && isBlankRow(rows[rows.length - 1])) rows.pop();

  return {
    rows,
    printed_totals: {
      this_page: line("this_page"),
      previous_pages: line("previous_pages"),
      total_time: line("total_time"),
    },
    totals_confidence: totalsConfidence,
  };
}

/** The instructions sent with every photo. Stable text, so it caches. */
export const EXTRACTION_PROMPT = `You are transcribing one photo of a paper EASA pilot logbook (Part-FCL format). The photo shows one two-page spread: the LEFT page carries columns 1–8 and the RIGHT page carries columns 9–12 plus remarks.

Columns, in order:
1 date — as written
2 departure: place (dep_place) and time (dep_time)
3 arrival: place (arr_place) and time (arr_time)
4 aircraft: type (aircraft_type) and registration
5 single-pilot time: SE (se) and ME (me)
6 multi-pilot time (multi_pilot)
7 total time of flight (total_time)
8 name of PIC (pic_name)
9 landings: day (landings_day) and night (landings_night)
10 operational condition time: night (night) and IFR (ifr)
11 pilot function time: PIC (pic), co-pilot (copilot), dual (dual), instructor (instructor)
12 FSTD session: date (fstd_date), type (fstd_type), total time of session (fstd_time)
13 remarks and endorsements (remarks)

At the foot of each page are three printed totals lines: "TOTAL THIS PAGE" (this_page), "TOTAL FROM PREVIOUS PAGES" (previous_pages) and "TOTAL TIME" (total_time). Transcribe all three for every numeric column (se, me, multi_pilot, total_time, landings_day, landings_night, night, ifr, pic, copilot, dual, instructor, fstd_time).

Rules — follow them exactly:
- TRANSCRIBE ONLY. Never correct, compute, complete or "fix" anything. If a total is arithmetically wrong, copy the wrong number. If a cell is empty, return null. Never fill a total in from the rows.
- Durations: write them as H:MM exactly as written (hours and minutes columns joined with a colon: "1" and "30" → "1:30", "0" and "45" → "0:45"). If the pilot wrote decimal hours, copy the decimal (e.g. "1.5"). Clock times as HH:MM (24h).
- Landings are whole numbers.
- Dates: copy as written (e.g. "12/03/24", "12.03"). Do not reformat or add a year.
- A ditto mark (", 〃, "do", a vertical line) means "same as above": write out the value it repeats and mark that field "medium" in uncertain.
- The photo may be rotated, skewed or curved at the spine. Read it in the logbook's own orientation.
- Rows on the right page may sit slightly higher or lower than their partner on the left page. Pair them by ORDER (first written row on the left with the first written row on the right, and so on), not by exact height.
- Return one row per written line, top to bottom, including lines that are crossed out. Skip completely empty lines.
- A line that has been struck or crossed out: transcribe what you can see and set struck_through true.
- If a value is illegible, return null for it and list it in uncertain with confidence "low". If you can read it but are not sure, return your reading and list it as "medium". Fields you read clearly are not listed.
- Do the same for the totals lines in uncertain_totals.
- photo_note: one short sentence if something about the photo prevents a full transcription (a page cut off, out of focus, not a logbook), otherwise null.`;
