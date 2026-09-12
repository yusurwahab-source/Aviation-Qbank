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

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_TEST_LENGTH;

  return Math.min(parsed, MAX_TEST_LENGTH);
}
