/**
 * How a test is chosen: how many questions, from which sections, and whether
 * it marks as you go or holds everything to the end.
 *
 * Everything here parses untrusted URL parameters, so the rules are: never
 * throw, never return something the caller must re-check, and always fall back
 * to a test the student can actually sit rather than to an error.
 */

/**
 * The two ways to sit a test.
 *
 * `study` marks each question as it is answered — the correct answer and the
 * explanation appear straight away, and that question then settles.
 * `exam` holds everything back until Finish, so answers can still be changed
 * on the way through, the way a real exam works.
 *
 * Study is the default: someone who has not chosen is practising, and
 * practice is better with the explanation in front of them.
 */
export const TEST_MODES = ["study", "exam"] as const;

export type TestMode = (typeof TEST_MODES)[number];

export const DEFAULT_TEST_MODE: TestMode = "study";

/**
 * Turns an untrusted `?mode=` value into a mode.
 *
 * Note what this is and is not. It decides what the test *shows*, not what a
 * student is *allowed* to see: a determined person could ask the server for
 * study-mode feedback during an exam-mode test. That costs them nothing they
 * could not get by starting a study-mode test instead, and it is their own
 * practice they are spoiling — so this is a setting, not a security boundary,
 * and is written here as one.
 */
export function parseTestMode(raw: string | string[] | undefined): TestMode {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim().toLowerCase();
  return TEST_MODES.includes(trimmed as TestMode) ? (trimmed as TestMode) : DEFAULT_TEST_MODE;
}

/** One-tap lengths offered beside the free number box. */
export const TEST_LENGTHS = [5, 10, 20] as const;

export const DEFAULT_TEST_LENGTH = 10;

/**
 * The student may ask for every question in their selection.
 *
 * There is no arbitrary ceiling: the real limit is how many questions exist,
 * which the query applies. A number far larger than the bank simply yields the
 * bank. That is safe because the database caps the work, not the URL.
 */
export const ALL_QUESTIONS = "all" as const;

export type TestLength = number | typeof ALL_QUESTIONS;

/** Longest topic the database column can hold; anything longer cannot match. */
const MAX_TOPIC_LENGTH = 60;

/** More sections than any realistic bank, to bound work from a hostile URL. */
const MAX_TOPICS = 50;

/**
 * Turns an untrusted `?questions=` value into a test length.
 *
 * `all` means every question in the chosen sections. Anything missing,
 * negative, fractional or unreadable falls back to the default.
 */
export function parseTestLength(raw: string | string[] | undefined): TestLength {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return DEFAULT_TEST_LENGTH;

  const trimmed = value.trim().toLowerCase();
  if (trimmed === ALL_QUESTIONS) return ALL_QUESTIONS;

  // Whole digits only. `parseInt` would happily read "10abc" as 10 and "1.5" as
  // 1, quietly honouring input the caller did not mean.
  if (!/^\d+$/.test(trimmed)) return DEFAULT_TEST_LENGTH;

  const parsed = Number.parseInt(trimmed, 10);
  if (parsed < 1) return DEFAULT_TEST_LENGTH;

  return parsed;
}

/**
 * Turns untrusted `?topic=` values into the sections to draw from.
 *
 * The parameter may repeat — `?topic=Fuel%20System&topic=Electrical` — which is
 * how a set of checkboxes submits. An empty result means "every section", so a
 * mangled link still gives the student a test rather than an empty screen.
 */
export function parseTopics(raw: string | string[] | undefined): string[] {
  const values = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];

  const topics = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value.length <= MAX_TOPIC_LENGTH);

  // A repeated section would only make the same questions likelier to appear.
  return [...new Set(topics)].slice(0, MAX_TOPICS);
}

/**
 * How many questions a test will actually contain.
 *
 * The student is shown this before they start, so a request for more than the
 * selection holds is answered honestly rather than by a silently shorter test.
 */
export function resolveTestSize(requested: TestLength, available: number): number {
  if (available <= 0) return 0;
  if (requested === ALL_QUESTIONS) return available;
  return Math.min(requested, available);
}

/**
 * Builds the URL for a test. Every link to a test goes through here, so the
 * shape of these parameters is decided in one place rather than spelled out at
 * each call site.
 */
export function buildTestHref(
  aircraftCode: string,
  options: {
    topics?: string[];
    length?: TestLength;
    retryOnly?: boolean;
    mode?: TestMode;
  } = {},
): string {
  const params = new URLSearchParams();

  if (options.retryOnly) params.set("from", "incorrect");
  for (const topic of options.topics ?? []) params.append("topic", topic);
  if (options.length !== undefined) params.set("questions", String(options.length));
  // The default is left out: a plain URL means study, which keeps the common
  // link short and makes `?mode=exam` mean something when it is there.
  if (options.mode !== undefined && options.mode !== DEFAULT_TEST_MODE) {
    params.set("mode", options.mode);
  }

  const query = params.toString();
  return `/aircraft/${aircraftCode}/test${query ? `?${query}` : ""}`;
}
