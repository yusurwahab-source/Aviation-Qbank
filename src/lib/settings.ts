import {
  FREE_QUESTIONS_PER_AIRCRAFT,
  PREVIEW_QUESTIONS_SIGNED_OUT,
} from "@/lib/billing/access-policy";

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

/** The four top-level sections the owner may hide as a whole. */
export const SECTION_KEYS = [
  "type-rating",
  "class-rating",
  "flying-knowledge",
  "pilot-sims",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_LABELS: Record<SectionKey, string> = {
  "type-rating": "Type Rating Systems Knowledge",
  "class-rating": "Class Rating Systems Knowledge",
  "flying-knowledge": "Flying Knowledge",
  "pilot-sims": "Pilot Sims",
};

function parseSectionKeys(values: Iterable<unknown>): SectionKey[] {
  const wanted = new Set(values);
  return SECTION_KEYS.filter((key) => wanted.has(key));
}

export function isSectionHidden(settings: Pick<SiteSettings, "hiddenSections">, key: SectionKey) {
  return settings.hiddenSections.includes(key);
}

export type SiteSettings = {
  /** How many questions a signed-in student may answer free, per aircraft. */
  freeQuestionsPerAircraft: number;
  /** How many questions a *signed-out* visitor may be shown the answer to,
   * per aircraft, before they have to make an account. A separate and much
   * smaller allowance than the one above — see `PREVIEW_QUESTIONS_SIGNED_OUT`
   * in `access-policy.ts` for why the two are not the same number. */
  previewQuestionsSignedOut: number;
  /** One line shown to everyone, above the page. Empty means no banner. */
  announcement: string;
  /** Whole-number percentage a test result needs to reach to show as a pass
   * on the results screen. Purely a label on the score — it changes nothing
   * about grading, access, or what is recorded. */
  passMarkPercent: number;
  /** The type rating aircraft the landing page's structured data (the
   * Course entry in `jsonLd`) names as an example — curation, not content:
   * every aircraft in `/content` is real and playable, this only decides
   * which one search engines are told about by name. The landing page's own
   * hero no longer features one aircraft over another (see the note on the
   * three sections in `CLAUDE.md`), so this is a narrower role than it once
   * had. Previously the hardcoded `FEATURED_AIRCRAFT_CODE` in
   * `src/config/aircraft-marketing.ts`. */
  featuredAircraftCode: string;
  /** Aircraft that are real and answerable today but not substantial enough
   * to lead with — shown on `/type-rating` with an "In development" badge
   * instead of a question count. Previously the hardcoded
   * `AIRCRAFT_IN_DEVELOPMENT` set in the same file. Neither this nor
   * `featuredAircraftCode` ever writes to the `aircraft` table — both only
   * decide what marketing surfaces say about rows that already exist. */
  aircraftInDevelopment: string[];
  /** Whole sections switched off by the owner: out of the navigation, the
   * landing page and the sitemap, and a 404 at their own URLs. Content is
   * untouched — hiding is a presentation switch, reversible with no deploy,
   * and `db:seed` never overrules it because it lives here, not in a file. */
  hiddenSections: SectionKey[];
};

export const SETTING_KEYS = {
  freeQuestionsPerAircraft: "free_questions_per_aircraft",
  previewQuestionsSignedOut: "preview_questions_signed_out",
  announcement: "announcement",
  passMarkPercent: "pass_mark_percent",
  featuredAircraftCode: "featured_aircraft_code",
  aircraftInDevelopment: "aircraft_in_development",
  hiddenSections: "hidden_sections",
} as const;

/** The default a checkride-style pass mark is usually quoted at. */
export const DEFAULT_PASS_MARK_PERCENT = 75;

/**
 * The two marketing defaults, carried over unchanged from the file this
 * replaces: the B737 bank is the one ready to lead with, and the DA40's 22
 * questions are too few to open with.
 */
const DEFAULT_FEATURED_AIRCRAFT_CODE = "B737";
const DEFAULT_AIRCRAFT_IN_DEVELOPMENT: readonly string[] = ["DA40"];

/** The behaviour of this app with an empty `site_settings` table. */
export const DEFAULT_SETTINGS: SiteSettings = {
  freeQuestionsPerAircraft: FREE_QUESTIONS_PER_AIRCRAFT,
  previewQuestionsSignedOut: PREVIEW_QUESTIONS_SIGNED_OUT,
  announcement: "",
  passMarkPercent: DEFAULT_PASS_MARK_PERCENT,
  featuredAircraftCode: DEFAULT_FEATURED_AIRCRAFT_CODE,
  aircraftInDevelopment: [...DEFAULT_AIRCRAFT_IN_DEVELOPMENT],
  hiddenSections: [],
};

/** The same shape every other aircraft code in this app is validated
 * against — see `submissionSchema` in the test actions. */
const AIRCRAFT_CODE_PATTERN = /^[A-Z][A-Z0-9]{1,7}$/;

/** However many aircraft this bank could plausibly grow to before a bound
 * this generous would need revisiting — the same "protect the machine"
 * reasoning as `PRESET_COUNT_CEILING`. */
const MAX_AIRCRAFT_IN_DEVELOPMENT = 50;

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
  previewQuestionsSignedOut: unknown;
  announcement: unknown;
  passMarkPercent: unknown;
  featuredAircraftCode: unknown;
  /** Newline- or comma-separated, exactly as a textarea hands it over —
   * parsing the raw field shape is this function's job, the same as every
   * other field here. */
  aircraftInDevelopment: unknown;
  /** The checked section boxes, as `formData.getAll` returns them. */
  hiddenSections?: unknown[];
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

  const preview = Number(input.previewQuestionsSignedOut);

  if (
    typeof input.previewQuestionsSignedOut !== "string" ||
    input.previewQuestionsSignedOut.trim() === "" ||
    !Number.isInteger(preview) ||
    preview < 0 ||
    preview > MAX_FREE_QUESTIONS
  ) {
    return {
      ok: false,
      error: `Signed-out preview questions must be a whole number from 0 to ${MAX_FREE_QUESTIONS}.`,
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

  const featuredAircraftCode =
    typeof input.featuredAircraftCode === "string" ? input.featuredAircraftCode.trim().toUpperCase() : "";

  if (!AIRCRAFT_CODE_PATTERN.test(featuredAircraftCode)) {
    return {
      ok: false,
      error: "The featured aircraft must be a valid aircraft code, e.g. B737.",
    };
  }

  const rawInDevelopment =
    typeof input.aircraftInDevelopment === "string" ? input.aircraftInDevelopment : "";
  const inDevelopmentCodes = Array.from(
    new Set(
      rawInDevelopment
        .split(/[,\n]/)
        .map((code) => code.trim().toUpperCase())
        .filter((code) => code !== ""),
    ),
  );

  if (inDevelopmentCodes.length > MAX_AIRCRAFT_IN_DEVELOPMENT) {
    return {
      ok: false,
      error: `List at most ${MAX_AIRCRAFT_IN_DEVELOPMENT} aircraft as in development.`,
    };
  }

  const invalidCode = inDevelopmentCodes.find((code) => !AIRCRAFT_CODE_PATTERN.test(code));
  if (invalidCode) {
    return {
      ok: false,
      error: `"${invalidCode}" is not a valid aircraft code.`,
    };
  }

  return {
    ok: true,
    settings: {
      freeQuestionsPerAircraft: free,
      previewQuestionsSignedOut: preview,
      announcement,
      passMarkPercent: passMark,
      featuredAircraftCode,
      aircraftInDevelopment: inDevelopmentCodes,
      hiddenSections: parseSectionKeys(input.hiddenSections ?? []),
    },
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

  const rawPreview = stored.get(SETTING_KEYS.previewQuestionsSignedOut);
  const preview = rawPreview === undefined ? Number.NaN : Number(rawPreview);

  const rawAnnouncement = stored.get(SETTING_KEYS.announcement) ?? "";

  const rawPassMark = stored.get(SETTING_KEYS.passMarkPercent);
  const passMark = rawPassMark === undefined ? Number.NaN : Number(rawPassMark);

  const rawFeatured = stored.get(SETTING_KEYS.featuredAircraftCode)?.trim().toUpperCase() ?? "";
  const featuredAircraftCode = AIRCRAFT_CODE_PATTERN.test(rawFeatured)
    ? rawFeatured
    : DEFAULT_SETTINGS.featuredAircraftCode;

  const rawInDevelopment = stored.get(SETTING_KEYS.aircraftInDevelopment);
  const aircraftInDevelopment =
    rawInDevelopment === undefined
      ? DEFAULT_SETTINGS.aircraftInDevelopment
      : rawInDevelopment
          .split(",")
          .map((code) => code.trim().toUpperCase())
          .filter((code) => AIRCRAFT_CODE_PATTERN.test(code))
          .slice(0, MAX_AIRCRAFT_IN_DEVELOPMENT);

  return {
    freeQuestionsPerAircraft:
      Number.isInteger(free) && free >= 0 && free <= MAX_FREE_QUESTIONS
        ? free
        : DEFAULT_SETTINGS.freeQuestionsPerAircraft,
    previewQuestionsSignedOut:
      Number.isInteger(preview) && preview >= 0 && preview <= MAX_FREE_QUESTIONS
        ? preview
        : DEFAULT_SETTINGS.previewQuestionsSignedOut,
    announcement: rawAnnouncement.trim().slice(0, MAX_ANNOUNCEMENT_LENGTH),
    passMarkPercent:
      Number.isInteger(passMark) &&
      passMark >= MIN_PASS_MARK_PERCENT &&
      passMark <= MAX_PASS_MARK_PERCENT
        ? passMark
        : DEFAULT_SETTINGS.passMarkPercent,
    featuredAircraftCode,
    aircraftInDevelopment,
    hiddenSections: parseSectionKeys(
      (stored.get(SETTING_KEYS.hiddenSections) ?? "").split(",").map((key) => key.trim()),
    ),
  };
}

/** The rows to store for a validated set of settings. */
export function settingsToRows(settings: SiteSettings): { key: string; value: string }[] {
  return [
    {
      key: SETTING_KEYS.freeQuestionsPerAircraft,
      value: String(settings.freeQuestionsPerAircraft),
    },
    {
      key: SETTING_KEYS.previewQuestionsSignedOut,
      value: String(settings.previewQuestionsSignedOut),
    },
    { key: SETTING_KEYS.announcement, value: settings.announcement },
    { key: SETTING_KEYS.passMarkPercent, value: String(settings.passMarkPercent) },
    { key: SETTING_KEYS.featuredAircraftCode, value: settings.featuredAircraftCode },
    {
      key: SETTING_KEYS.aircraftInDevelopment,
      value: settings.aircraftInDevelopment.join(","),
    },
    { key: SETTING_KEYS.hiddenSections, value: settings.hiddenSections.join(",") },
  ];
}
