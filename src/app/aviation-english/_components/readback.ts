/** Compare a typed readback with the model one, ignoring case and punctuation. */
export function normaliseReadback(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Share (0-1) of the expected words present in the answer. */
export function readbackScore(answer: string, expected: string): number {
  const have = new Set(normaliseReadback(answer));
  const want = normaliseReadback(expected);
  if (want.length === 0) return 0;
  return want.filter((w) => have.has(w)).length / want.length;
}

export const READBACK_PASS = 0.8;
