/**
 * Curation, not content: which aircraft the marketing surfaces feature.
 *
 * Every aircraft in `/content` is real and playable — this file only decides
 * what the landing page and the picker say about each one. It is kept
 * separate from `aircraft.json` because it is a presentation decision, not a
 * fact about the aircraft: the B737 bank being ready to lead with, and the
 * DA40's 22 questions being too few to open with, are both true today and
 * both could change without either aircraft's own data changing.
 */

/** The aircraft the landing page is built around. */
export const FEATURED_AIRCRAFT_CODE = "B737";

/**
 * Aircraft that are real and answerable today but not yet substantial
 * enough to lead with. Hidden from the landing page entirely, and shown on
 * `/aircraft` with an "In development" badge instead of a question count —
 * the picker never hides an aircraft outright, since a direct link to it
 * must keep working.
 */
export const AIRCRAFT_IN_DEVELOPMENT: ReadonlySet<string> = new Set(["DA40"]);
