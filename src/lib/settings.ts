import { FREE_QUESTIONS_PER_AIRCRAFT } from "@/lib/billing/access-policy";

/**
 * What the owner may change from the website, and what each value is allowed
 * to be.
 *
 * Pure, like `access-policy.ts` and `grading.ts`: the database stores text
 * against a key and knows nothing about what any of it means, and this is
 * the one place that decides. That is what makes "what happens when a
 * setting is missing, or nonsense" a testable question rather than something
 * each reader answers for itself.
 *
 * **Every setting has a default in code, and the stored value is an
 * override.** A fresh clone with an empty table behaves exactly like this
 * application did before settings existed — which is also what a deployment
 * falls back to if the settings read ever fails. There is deliberately no
 * setting whose absence breaks anything.
 *
 * This is emphatically not where content lives. `/content` is the source of
 * truth for aircraft and questions, and `db:seed` rewrites those tables from
 * the files on every deploy — a "hide this aircraft" switch stored here
 * would be a second source of truth that the files silently overrule. What
 * belongs here is what no file describes.
 */

export type SiteSettings = {
  /** How many questions a signed-in student may answer free, per aircraft. */
  freeQuestionsPerAircraft: number;
  /** One line shown to everyone, above the page. Empty means no banner. */
  announcement: string;
  /** Whole-number percentage a test result needs to reach to show as a pass
   * on the results screen. Purely a label on the score — it changes nothing
   * about grading, access, or what is recorded. */
  passMarkPercent: number;
};

export const SETTING_KEYS = {
  freeQuestionsPerAircraft: "free_questions_per_aircraft",
  announcement: "announcement",
  passMarkPercent: "pass_mark_percent",
} as const;

/** The default a checkride-style pass mark is usually quoted at. */
export const DEFAULT_PASS_MARK_PERCENT = 75;

/** The behaviour of this app with an empty `site_settings` table. */
export const DEFAULT_SETTINGS: SiteSettings = {
  freeQuestionsPerAircraft: FREE_QUESTIONS_PER_AIRCRAFT,
  announcement: "",
  passMarkPercent: DEFAULT_PASS_MARK_PERCENT,
};

/**
 * An allowance of zero is meaningful — it means "no free questions at all" —
 * so the floor is zero rather than one. The ceiling is not a product rule
 * either; it is the same kind of bound `MAX_ANSWERS` is, there so a typo
 * cannot store a number that makes the paywall meaningless by accident.
 */
export const MAX_FREE_QUESTIONS = 10_000;

/** Long enough for a sentence, short enough to stay one line on a phone. */
export const MAX_ANNOUNCEMENT_LENGTH = 160;

/** A pass mark is a percentage, so 1 to 100 is the whole of what it can mean;
 * 0 would fail nobody and neither is a pass mark worth having. */
export const MIN_PASS_MARK_PERCENT = 1;
export const MAX_PASS_MARK_PERCENT = 100;

export type SettingsValidation =
  | { ok: true; settings: SiteSettings }
  | { ok: false; error: string };

/**
 * Checks a settings form's input before any of it is stored.
 *
 * The form is the only way a value is written, so this is where a bad value
 * is refused — loudly, to the one person who can fix it. Reading is the
 * opposite case and is deliberately forgiving; see `parseSettings`.
 */
export function validateSettings(input: {
  freeQuestionsPerAircraft: unknown;
  announcement: unknown;
  passMarkPercent: unknown;
}): SettingsValidation {
  const free = Number(input.freeQuestionsPerAircraft);

  if (
    typeof input.freeQuestionsPerAircraft !== "string" ||
    input.freeQuestionsPerAircraft.trim() === "" ||
    !Number.isInteger(free) ||
    free < 0 ||
    free > MAX_FREE_QUESTIONS
  ) {
    return {
      ok: false,
      error: `Free questions must be a whole number from 0 to ${MAX_FREE_QUESTIONS}.`,
    };
  }

  const announcement = typeof input.announcement === "string" ? input.announcement.trim() : "";

  if (announcement.length > MAX_ANNOUNCEMENT_LENGTH) {
    return {
      ok: false,
      error: `The announcement must be ${MAX_ANNOUNCEMENT_LENGTH} characters or fewer.`,
    };
  }

  const passMark = Number(input.passMarkPercent);

  if (
    typeof input.passMarkPercent !== "string" ||
    input.passMarkPercent.trim() === "" ||
    !Number.isInteger(passMark) ||
    passMark < MIN_PASS_MARK_PERCENT ||
    passMark > MAX_PASS_MARK_PERCENT
  ) {
    return {
      ok: false,
      error: `Pass mark must be a whole number from ${MIN_PASS_MARK_PERCENT} to ${MAX_PASS_MARK_PERCENT}.`,
    };
  }

  return {
    ok: true,
    settings: { freeQuestionsPerAircraft: free, announcement, passMarkPercent: passMark },
  };
}

/**
 * Turns stored rows into settings, falling back to the default for anything
 * missing or unreadable.
 *
 * Forgiving on purpose, and the opposite of how `/content` is treated: a
 * malformed question file stops the build because a student must never see
 * bad content, whereas a malformed settings row should never be able to take
 * the site down — least of all the paywall, which is what the free allowance
 * feeds. The value came from a validated form, so a bad row means something
 * has already gone wrong elsewhere; the right answer to that is the
 * behaviour the app shipped with, not an error page.
 */
export function parseSettings(rows: { key: string; value: string }[]): SiteSettings {
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  const rawFree = stored.get(SETTING_KEYS.freeQuestionsPerAircraft);
  const free = rawFree === undefined ? Number.NaN : Number(rawFree);

  const rawAnnouncement = stored.get(SETTING_KEYS.announcement) ?? "";

  const rawPassMark = stored.get(SETTING_KEYS.passMarkPercent);
  const passMark = rawPassMark === undefined ? Number.NaN : Number(rawPassMark);

  return {
    freeQuestionsPerAircraft:
      Number.isInteger(free) && free >= 0 && free <= MAX_FREE_QUESTIONS
        ? free
        : DEFAULT_SETTINGS.freeQuestionsPerAircraft,
    announcement: rawAnnouncement.trim().slice(0, MAX_ANNOUNCEMENT_LENGTH),
    passMarkPercent:
      Number.isInteger(passMark) &&
      passMark >= MIN_PASS_MARK_PERCENT &&
      passMark <= MAX_PASS_MARK_PERCENT
        ? passMark
        : DEFAULT_SETTINGS.passMarkPercent,
  };
}

/** The rows to store for a validated set of settings. */
export function settingsToRows(settings: SiteSettings): { key: string; value: string }[] {
  return [
    {
      key: SETTING_KEYS.freeQuestionsPerAircraft,
      value: String(settings.freeQuestionsPerAircraft),
    },
    { key: SETTING_KEYS.announcement, value: settings.announcement },
    { key: SETTING_KEYS.passMarkPercent, value: String(settings.passMarkPercent) },
  ];
}
