/**
 * Reading and writing the numbers a logbook is made of. Pure and tested.
 *
 * A logbook writes durations as hours and minutes ("1:30", sometimes in two
 * printed sub-columns that the model joins with a colon), occasionally as
 * decimal hours ("1.5"). Everything is turned into whole minutes here, once,
 * so no check downstream ever adds a "1:30" to a "0:45" as text.
 */

/** "1:30" → 90, "1234:05" → 74045, "1.5" → 90, "0.25" → 15, ":45" → 45.
 * Anything else — including a bare "130", which could be either — is null. */
export function parseDuration(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const text = raw.trim().replace(/\s+/g, "").replace(/[hH]/, ":").replace(/[.:]$/, "");
  if (text === "" || text === "-" || text === "—") return null;

  const hm = /^(\d{0,5}):(\d{1,2})$/.exec(text);
  if (hm) {
    const hours = hm[1] === "" ? 0 : Number(hm[1]);
    const minutes = Number(hm[2]);
    if (minutes > 59) return null;
    return hours * 60 + minutes;
  }

  const decimal = /^(\d{1,5})[.,](\d{1,2})$/.exec(text);
  if (decimal) {
    return Math.round(Number(`${decimal[1]}.${decimal[2]}`) * 60);
  }

  // A whole number of hours with nothing after it ("3") is unambiguous.
  if (/^\d{1,2}$/.test(text)) return Number(text) * 60;

  return null;
}

/** 90 → "1:30", 0 → "0:00", 74045 → "1234:05". Null stays null. */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "";
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minutes));
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
}

/** "14:05" or "1405" or "14.05" → 845 (minutes after midnight). */
export function parseClock(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const text = raw.trim().replace(/\s+/g, "");
  const match = /^(\d{1,2})[:.h]?(\d{2})$/.exec(text);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) return null;
  return hours * 60 + minutes;
}

export function formatClock(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "";
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "3" → 3. Landings are whole numbers; anything else is unreadable. */
export function parseCount(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const text = raw.trim();
  if (text === "" || text === "-") return null;
  return /^\d{1,5}$/.test(text) ? Number(text) : null;
}

export type LogDate = { year: number; month: number; day: number };

/**
 * Reads a logbook date as a pilot writes one: day first, in the European
 * order — "12/03/24", "12.03.2024", "12-3-24" — or ISO "2024-03-12". A
 * date written without a year ("12/03") takes `fallbackYear`, which is how
 * a logbook page reads: the year is written once and then left off.
 */
export function parseLogDate(raw: string | null | undefined, fallbackYear?: number): LogDate | null {
  if (!raw) return null;
  const text = raw.trim();

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (iso) return checkDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dmy = /^(\d{1,2})[/.\- ](\d{1,2})(?:[/.\- ](\d{2}|\d{4}))?$/.exec(text);
  if (!dmy) return null;

  let year: number;
  if (dmy[3] === undefined) {
    if (fallbackYear === undefined) return null;
    year = fallbackYear;
  } else if (dmy[3].length === 2) {
    const yy = Number(dmy[3]);
    year = yy < 70 ? 2000 + yy : 1900 + yy;
  } else {
    year = Number(dmy[3]);
  }

  return checkDate(year, Number(dmy[2]), Number(dmy[1]));
}

function checkDate(year: number, month: number, day: number): LogDate | null {
  if (month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return null;
  return { year, month, day };
}

/** Days since the epoch, for ordering and for "the last 90 days". */
export function dayNumber(date: LogDate): number {
  return Math.floor(Date.UTC(date.year, date.month - 1, date.day) / 86_400_000);
}

export function formatLogDate(date: LogDate): string {
  return `${String(date.day).padStart(2, "0")}/${String(date.month).padStart(2, "0")}/${date.year}`;
}

export function isoDate(date: LogDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}
