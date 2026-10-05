import { z } from "zod";

import { ROW_FIELDS, TOTALED_FIELDS, TOTALS_LINES, type LogbookPage } from "./model";

/**
 * What "Save to my account" stores in `logbooks.data`, and the schema it is
 * held to on the way in — a server action is a public endpoint, and this is
 * JSON a browser built. Photos are never part of it.
 */

export const MAX_SAVED_BYTES = 2_000_000;

const minutes = z.number().int().min(-1_000_000).max(10_000_000).nullable();
const text = z.string().max(500).nullable();
const level = z.enum(["medium", "low"]);

const rowSchema = z.object({
  date: text,
  dep_place: text,
  dep_time: minutes,
  arr_place: text,
  arr_time: minutes,
  aircraft_type: text,
  registration: text,
  se: minutes,
  me: minutes,
  multi_pilot: minutes,
  total_time: minutes,
  pic_name: text,
  landings_day: minutes,
  landings_night: minutes,
  night: minutes,
  ifr: minutes,
  pic: minutes,
  copilot: minutes,
  dual: minutes,
  instructor: minutes,
  fstd_date: text,
  fstd_type: text,
  fstd_time: minutes,
  remarks: text,
  struck_through: z.boolean(),
  confidence: z.partialRecord(z.enum(ROW_FIELDS), level),
});

const totalsLine = z.object(
  Object.fromEntries(TOTALED_FIELDS.map((field) => [field, minutes])) as Record<
    (typeof TOTALED_FIELDS)[number],
    typeof minutes
  >,
);

export const pageSchema = z.object({
  rows: z.array(rowSchema).max(60),
  printed_totals: z.object({
    this_page: totalsLine,
    previous_pages: totalsLine,
    total_time: totalsLine,
  }),
  totals_confidence: z.record(
    z.string().regex(new RegExp(`^(${TOTALS_LINES.join("|")})\\.(${TOTALED_FIELDS.join("|")})$`)),
    level,
  ),
});

export const savedSpreadSchema = z.object({
  key: z.string().max(64),
  page: pageSchema,
  original: pageSchema,
  note: z.string().max(500).nullable(),
  done: z.boolean(),
  ignored: z.array(z.string().max(120)).max(2000),
});

export const savedLogbookSchema = z.object({
  version: z.literal(1),
  spreads: z.array(savedSpreadSchema).max(100),
});

export type SavedSpread = z.infer<typeof savedSpreadSchema> & { page: LogbookPage; original: LogbookPage };
export type SavedLogbook = { version: 1; spreads: SavedSpread[] };

/** Reads a stored logbook back, or null if it does not match — never throws. */
export function parseSavedLogbook(data: unknown): SavedLogbook | null {
  const parsed = savedLogbookSchema.safeParse(data);
  return parsed.success ? (parsed.data as SavedLogbook) : null;
}
