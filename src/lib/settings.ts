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
  "type-rating": "Jets & Turboprops",
  "class-rating": "Light Aircraft",
  "flying-knowledge": "EASA ATPL Ground School",
  "pilot-sims": "Flight Training Tools",
};

/** The same sections, short enough for a navigation bar and a row of
 * buttons. Used only where space is tight; the full name stays the page's
 * own title. */
export const SECTION_SHORT_LABELS: Record<SectionKey, string> = {
  "type-rating": "Jets & Turboprops",
  "class-rating": "Light Aircraft",
  "flying-knowledge": "ATPL Ground School",
  "pilot-sims": "Training Tools",
};

/** The card text under each section on the landing page, as shipped. */
export const DEFAULT_SECTION_DESCRIPTIONS: Record<ItemSection, string> = {
  "type-rating":
    "Large aircraft, system by system. Study with explanations in front of you, or sit a timed mock exam.",
  "class-rating":
    "Light aircraft, practised the same way — no single-engine or multi-engine split, just the aircraft itself.",
  "flying-knowledge":
    "The EASA ATPL theory subjects, one question bank each — built so you can see why every answer is right. Free in full.",
};

/** Plain text only, shown through React (which escapes it) — never HTML. */
export const MAX_LABEL_LENGTH = 80;
export const MAX_DESCRIPTION_LENGTH = 400;

export type SectionLabel = { title?: string; description?: string };
export type ItemOverride = { name?: string; description?: string };

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  return text === "" ? undefined : text.slice(0, max);
}

function parseJson(raw: string | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function cleanSectionLabels(
  input: unknown,
): Partial<Record<SectionKey, SectionLabel>> {
  const out: Partial<Record<SectionKey, SectionLabel>> = {};
  if (typeof input !== "object" || input === null) return out;
  for (const key of SECTION_KEYS) {
    const entry = (input as Record<string, unknown>)[key];
    if (typeof entry !== "object" || entry === null) continue;
    const title = cleanText((entry as SectionLabel).title, MAX_LABEL_LENGTH);
    const description = cleanText(
      (entry as SectionLabel).description,
      MAX_DESCRIPTION_LENGTH,
    );
    if (title || description)
      out[key] = {
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
      };
  }
  return out;
}

function cleanItemOverrides(input: unknown): Record<string, ItemOverride> {
  const out: Record<string, ItemOverride> = {};
  if (typeof input !== "object" || input === null) return out;
  for (const [key, entry] of Object.entries(input as Record<string, unknown>)) {
    if (
      !ITEM_KEY_PATTERN.test(key) ||
      typeof entry !== "object" ||
      entry === null
    )
      continue;
    const name = cleanText((entry as ItemOverride).name, MAX_LABEL_LENGTH);
    const description = cleanText(
      (entry as ItemOverride).description,
      MAX_DESCRIPTION_LENGTH,
    );
    if (name || description)
      out[key] = {
        ...(name ? { name } : {}),
        ...(description ? { description } : {}),
      };
    if (Object.keys(out).length >= MAX_HIDDEN_ITEMS) break;
  }
  return out;
}

export function sectionTitle(
  settings: Pick<SiteSettings, "sectionLabels">,
  key: SectionKey,
): string {
  return settings.sectionLabels[key]?.title ?? SECTION_LABELS[key];
}

/** The short name, unless the owner has renamed the section — a name they
 * chose is never second-guessed into something shorter. */
export function sectionShortTitle(
  settings: Pick<SiteSettings, "sectionLabels">,
  key: SectionKey,
): string {
  return settings.sectionLabels[key]?.title ?? SECTION_SHORT_LABELS[key];
}

export function sectionDescription(
  settings: Pick<SiteSettings, "sectionLabels">,
  key: ItemSection,
): string {
  return (
    settings.sectionLabels[key]?.description ??
    DEFAULT_SECTION_DESCRIPTIONS[key]
  );
}

/** Shows the owner's display name and description for one aircraft, class
 * rating or subject. Display only: the code, the id and every question
 * stay exactly as the content files define them. */
export function withItemOverride<
  T extends { code: string; name: string; description: string },
>(
  settings: Pick<SiteSettings, "itemOverrides">,
  section: ItemSection,
  row: T,
): T {
  const override = settings.itemOverrides[itemKey(section, row.code)];
  if (!override) return row;
  return {
    ...row,
    name: override.name ?? row.name,
    description: override.description ?? row.description,
  };
}

export function withItemOverrides<
  T extends { code: string; name: string; description: string },
>(
  settings: Pick<SiteSettings, "itemOverrides">,
  section: ItemSection,
  rows: T[],
): T[] {
  return rows.map((row) => withItemOverride(settings, section, row));
}

function parseSectionKeys(values: Iterable<unknown>): SectionKey[] {
  const wanted = new Set(values);
  return SECTION_KEYS.filter((key) => wanted.has(key));
}

/** The three trees whose individual aircraft, class ratings or subjects may
 * be hidden — Pilot Sims has no per-item rows to hide. */
export type ItemSection = Exclude<SectionKey, "pilot-sims">;

const ITEM_KEY_PATTERN =
  /^(type-rating|class-rating|flying-knowledge):[A-Z][A-Z0-9]{1,7}$/;
const MAX_HIDDEN_ITEMS = 200;

export function itemKey(section: ItemSection, code: string): string {
  return `${section}:${code.toUpperCase()}`;
}

function parseItemKeys(values: Iterable<unknown>): string[] {
  const keys = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const key = value
      .trim()
      .toUpperCase()
      .replace(/^([A-Z-]+):/, (m) => m.toLowerCase());
    if (ITEM_KEY_PATTERN.test(key)) keys.add(key);
  }
  return [...keys].slice(0, MAX_HIDDEN_ITEMS);
}

export function isItemHidden(
  settings: Pick<SiteSettings, "hiddenSections" | "hiddenItems">,
  section: ItemSection,
  code: string,
): boolean {
  return (
    isSectionHidden(settings, section) ||
    settings.hiddenItems.includes(itemKey(section, code))
  );
}

/** Drops the rows the owner has hidden from a list of aircraft, class
 * ratings or subjects. */
export function withoutHidden<T extends { code: string }>(
  settings: Pick<SiteSettings, "hiddenSections" | "hiddenItems">,
  section: ItemSection,
  rows: T[],
): T[] {
  return rows.filter((row) => !isItemHidden(settings, section, row.code));
}

export function isSectionHidden(
  settings: Pick<SiteSettings, "hiddenSections">,
  key: SectionKey,
) {
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
  /** Individual aircraft, class ratings or subjects switched off until they
   * are ready for students, as `section:CODE` (e.g. `type-rating:B737`).
   * Same behaviour as a hidden section, one row at a time; the owner can
   * still open a hidden item's own URL to preview it. */
  hiddenItems: string[];
  /** Owner-chosen section names and landing-card text. A missing entry means
   * the default wording above. Display only; never changes a URL. */
  sectionLabels: Partial<Record<SectionKey, SectionLabel>>;
  /** Owner-chosen name and description per aircraft, class rating or
   * subject, keyed `section:CODE`. Display only; never changes a code. */
  itemOverrides: Record<string, ItemOverride>;
};

export const SETTING_KEYS = {
  freeQuestionsPerAircraft: "free_questions_per_aircraft",
  previewQuestionsSignedOut: "preview_questions_signed_out",
  announcement: "announcement",
  passMarkPercent: "pass_mark_percent",
  featuredAircraftCode: "featured_aircraft_code",
  aircraftInDevelopment: "aircraft_in_development",
  hiddenSections: "hidden_sections",
  hiddenItems: "hidden_items",
  sectionLabels: "section_labels",
  itemOverrides: "item_overrides",
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
  hiddenItems: [],
  sectionLabels: {},
  itemOverrides: {},
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
  /** The checked `section:CODE` boxes, as `formData.getAll` returns them. */
  hiddenItems?: unknown[];
  /** `{ [sectionKey]: { title, description } }`, built from the form. */
  sectionLabels?: unknown;
  /** `{ ["section:CODE"]: { name, description } }`, built from the form. */
  itemOverrides?: unknown;
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

  const announcement =
    typeof input.announcement === "string" ? input.announcement.trim() : "";

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
    typeof input.featuredAircraftCode === "string"
      ? input.featuredAircraftCode.trim().toUpperCase()
      : "";

  if (!AIRCRAFT_CODE_PATTERN.test(featuredAircraftCode)) {
    return {
      ok: false,
      error: "The featured aircraft must be a valid aircraft code, e.g. B737.",
    };
  }

  const rawInDevelopment =
    typeof input.aircraftInDevelopment === "string"
      ? input.aircraftInDevelopment
      : "";
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

  const invalidCode = inDevelopmentCodes.find(
    (code) => !AIRCRAFT_CODE_PATTERN.test(code),
  );
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
      hiddenItems: parseItemKeys(input.hiddenItems ?? []),
      sectionLabels: cleanSectionLabels(input.sectionLabels),
      itemOverrides: cleanItemOverrides(input.itemOverrides),
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
export function parseSettings(
  rows: { key: string; value: string }[],
): SiteSettings {
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  const rawFree = stored.get(SETTING_KEYS.freeQuestionsPerAircraft);
  const free = rawFree === undefined ? Number.NaN : Number(rawFree);

  const rawPreview = stored.get(SETTING_KEYS.previewQuestionsSignedOut);
  const preview = rawPreview === undefined ? Number.NaN : Number(rawPreview);

  const rawAnnouncement = stored.get(SETTING_KEYS.announcement) ?? "";

  const rawPassMark = stored.get(SETTING_KEYS.passMarkPercent);
  const passMark = rawPassMark === undefined ? Number.NaN : Number(rawPassMark);

  const rawFeatured =
    stored.get(SETTING_KEYS.featuredAircraftCode)?.trim().toUpperCase() ?? "";
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
      (stored.get(SETTING_KEYS.hiddenSections) ?? "")
        .split(",")
        .map((key) => key.trim()),
    ),
    hiddenItems: parseItemKeys(
      (stored.get(SETTING_KEYS.hiddenItems) ?? "").split(","),
    ),
    sectionLabels: cleanSectionLabels(parseJson(stored.get(SETTING_KEYS.sectionLabels))),
    itemOverrides: cleanItemOverrides(parseJson(stored.get(SETTING_KEYS.itemOverrides))),
  };
}

/** The rows to store for a validated set of settings. */
export function settingsToRows(
  settings: SiteSettings,
): { key: string; value: string }[] {
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
    {
      key: SETTING_KEYS.passMarkPercent,
      value: String(settings.passMarkPercent),
    },
    {
      key: SETTING_KEYS.featuredAircraftCode,
      value: settings.featuredAircraftCode,
    },
    {
      key: SETTING_KEYS.aircraftInDevelopment,
      value: settings.aircraftInDevelopment.join(","),
    },
    {
      key: SETTING_KEYS.hiddenSections,
      value: settings.hiddenSections.join(","),
    },
    { key: SETTING_KEYS.hiddenItems, value: settings.hiddenItems.join(",") },
    {
      key: SETTING_KEYS.sectionLabels,
      value: JSON.stringify(settings.sectionLabels),
    },
    {
      key: SETTING_KEYS.itemOverrides,
      value: JSON.stringify(settings.itemOverrides),
    },
  ];
}

/**
 * The same settings with nothing hidden. The owner sees every section, class
 * rating and subject as normal; everyone else gets the settings unchanged
 * (`getVisibleSiteSettings` in `lib/settings-visibility.ts` chooses).
 */
export function unhidden(settings: SiteSettings): SiteSettings {
  return { ...settings, hiddenSections: [], hiddenItems: [] };
}
