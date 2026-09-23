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

/**
 * The builder's quick presets ("Questions I got wrong", "My flagged
 * questions", "Unseen questions") stop counting past this and show it as
 * "500+" — the exact number stops being useful to a student once a list is
 * already this long, and it bounds the query the same way `MAX_ANSWERS`
 * bounds a submission: a fact about what is worth counting, not a product
 * limit on how many questions any of these presets can actually return.
 */
export const PRESET_COUNT_CEILING = 500;

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

/**
 * Exam mode is timed; study mode is not. This is not an option the student
 * sets — it is what the two modes *are*. An exam you can take all afternoon
 * over is not an exam, and a clock counting down while someone is reading an
 * explanation is pressure with nothing to gain from it.
 *
 * One minute a question, so the limit follows the test the student built
 * rather than a number chosen in a dialog. Twenty questions is twenty
 * minutes; sixty is an hour. Nothing to work out and nothing to get wrong.
 */
export const EXAM_SECONDS_PER_QUESTION = 60;

/**
 * The clock a test of this shape gets, in seconds — `null` for no clock.
 *
 * Derived, never parsed: there is no `?minutes=` any more, so there is no
 * untrusted input here to bound. The question count is already bounded by
 * how many questions exist.
 */
export function timeLimitFor(mode: TestMode, questionCount: number): number | null {
  if (mode !== "exam") return null;
  // A zero-question test never reaches the runner, but a zero-second clock
  // would expire the instant it was drawn, so never return one.
  return Math.max(1, questionCount) * EXAM_SECONDS_PER_QUESTION;
}

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
 * When a timed test runs out, given when its clock started.
 *
 * Deliberately derived rather than stored: `startedAt` and `timeLimitSeconds`
 * are written once, together, and the deadline follows from them. Storing a
 * deadline instead would let the two drift apart, with no way to tell which
 * was right.
 */
export function deadlineFrom(startedAt: Date, timeLimitSeconds: number): Date {
  return new Date(startedAt.getTime() + timeLimitSeconds * 1000);
}

/** Seconds left on a deadline, never negative. Zero means time is up. */
export function secondsLeft(deadline: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 1000));
}

/**
 * Seconds since a start, never negative.
 *
 * The study-mode counterpart to `secondsLeft`: study mode has no deadline to
 * count down to, so it counts up from when the test began. Same reason for
 * deriving it from a fixed instant rather than incrementing a number — a
 * backgrounded tab misses ticks, and the next one still shows the truth.
 */
export function secondsSince(startedAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
}

/**
 * `m:ss`, or `h:mm:ss` once there is an hour to show.
 *
 * Used both ways round — exam counts down, study counts up — so it is named
 * for what it renders rather than for which direction it happens to serve.
 */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

export type TestHrefOptions = {
  topics?: string[];
  length?: TestLength;
  retryOnly?: boolean;
  /**
   * The other two pre-built lists a test can draw from instead of
   * `topics` — the student's own flags, or every question they have never
   * answered. `retryOnly` stays its own option rather than folding into
   * this one: it predates it, and renaming a boolean every call site
   * already uses is a bigger diff than the two options coexisting.
   */
  from?: "flagged" | "unseen";
  mode?: TestMode;
};

/**
 * Builds the URL for a test under a given base path. Both `buildTestHref`
 * (aircraft) and `buildClassTestHref` (class ratings) are this with their
 * own base — the parameter shape is decided once, here, rather than spelled
 * out at each call site.
 *
 * Exported, not just used internally, because the shared practice-test UI
 * (`components/practice-test/`) is a client component and a *function* like
 * `buildTestHref` cannot cross the server → client boundary as a prop —
 * only a Server Action can. The UI is instead given the base path as a
 * plain string and calls this directly, which a client component may
 * always import.
 */
export function buildTestHrefFor(basePath: string, code: string, options: TestHrefOptions = {}): string {
  const params = new URLSearchParams();

  if (options.retryOnly) params.set("from", "incorrect");
  else if (options.from) params.set("from", options.from);
  for (const topic of options.topics ?? []) params.append("topic", topic);
  if (options.length !== undefined) params.set("questions", String(options.length));
  // The default is left out: a plain URL means study, which keeps the common
  // link short and makes `?mode=exam` mean something when it is there.
  if (options.mode !== undefined && options.mode !== DEFAULT_TEST_MODE) {
    params.set("mode", options.mode);
  }
  const query = params.toString();
  return `${basePath}/${code}/test${query ? `?${query}` : ""}`;
}

/**
 * Builds the URL for a type rating's test. Every link to one goes through
 * here.
 */
export function buildTestHref(aircraftCode: string, options: TestHrefOptions = {}): string {
  return buildTestHrefFor("/type-rating", aircraftCode, options);
}

/** The same, for a class rating's test — `/class-rating/CODE/test?...`. */
export function buildClassTestHref(classCode: string, options: TestHrefOptions = {}): string {
  return buildTestHrefFor("/class-rating", classCode, options);
}

/** The same, for a Flying Knowledge subject's test —
 * `/flying-knowledge/CODE/test?...`. */
export function buildFlyingKnowledgeTestHref(
  subjectCode: string,
  options: TestHrefOptions = {},
): string {
  return buildTestHrefFor("/flying-knowledge", subjectCode, options);
}

/**
 * The link a "Resume your test" banner uses — the one case that needs `?t=`
 * in the URL, which `buildTestHref` deliberately never sets: every other
 * caller wants a *fresh* test, and a fresh test's id is only ever minted by
 * the server's own redirect. This is the exception, because resuming is the
 * entire point — reusing the id already on the incomplete session is what
 * `findSession` on the test page recognises as "pick this back up" rather
 * than "start over".
 */
export function buildResumeHref(session: {
  clientTestId: string;
  aircraftCode: string;
  mode: TestMode;
  topics: string[];
}): string {
  return buildResumeHrefFor("/type-rating", session);
}

/** The same, for a class rating's own overview page —
 * `/class-rating/CODE/test`. */
export function buildClassResumeHref(session: {
  clientTestId: string;
  aircraftCode: string;
  mode: TestMode;
  topics: string[];
}): string {
  return buildResumeHrefFor("/class-rating", session);
}

/** The same, for a Flying Knowledge subject's own overview page —
 * `/flying-knowledge/CODE/test`. */
export function buildFlyingKnowledgeResumeHref(session: {
  clientTestId: string;
  aircraftCode: string;
  mode: TestMode;
  topics: string[];
}): string {
  return buildResumeHrefFor("/flying-knowledge", session);
}

function buildResumeHrefFor(
  basePath: string,
  session: { clientTestId: string; aircraftCode: string; mode: TestMode; topics: string[] },
): string {
  const params = new URLSearchParams({ t: session.clientTestId });
  if (session.mode !== DEFAULT_TEST_MODE) params.set("mode", session.mode);
  for (const topic of session.topics) params.append("topic", topic);
  return `${basePath}/${session.aircraftCode}/test?${params.toString()}`;
}
