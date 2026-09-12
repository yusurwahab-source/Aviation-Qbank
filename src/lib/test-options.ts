/** Test length options offered on the aircraft page. */
export const TEST_LENGTHS = [5, 10, 20] as const;

export const DEFAULT_TEST_LENGTH = 10;

/** Hard ceiling on questions per test, applied to whatever arrives in the URL. */
export const MAX_TEST_LENGTH = 50;

/**
 * Turns an untrusted `?questions=` value into a usable test length.
 * Anything missing, negative, fractional or absurd falls back to the default.
 */
export function parseTestLength(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return DEFAULT_TEST_LENGTH;

  // Whole digits only. `parseInt` would happily read "10abc" as 10 and "1.5" as
  // 1, quietly honouring input the caller did not mean.
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return DEFAULT_TEST_LENGTH;

  const parsed = Number.parseInt(trimmed, 10);
  if (parsed < 1) return DEFAULT_TEST_LENGTH;

  return Math.min(parsed, MAX_TEST_LENGTH);
}

/** Longest topic the database column can hold; anything longer cannot match. */
const MAX_TOPIC_LENGTH = 60;

/**
 * Turns an untrusted `?topic=` value into a topic to filter by.
 *
 * Returns undefined for anything missing or implausible, which means "every
 * topic" rather than "no questions" — a mangled link should still give the
 * student a test.
 */
export function parseTopic(raw: string | string[] | undefined): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_TOPIC_LENGTH) return undefined;

  return trimmed;
}
