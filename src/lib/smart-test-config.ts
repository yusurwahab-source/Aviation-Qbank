/**
 * Tuning knobs for the smart test's adaptive weighting — see the algorithm
 * itself in `smart-test.ts`. Kept here, and nowhere else, so these numbers
 * can be retuned without reading or touching the selection logic they feed.
 */

export type SmartTestWeights = {
  /** No attempt on record for this question at all. */
  neverSeen: number;
  /** The most recent attempt at this question was wrong. */
  wrongLastAttempt: number;
  /** Right, but not two or more times in a row. */
  rightOnce: number;
  /** Right, two or more times in a row. */
  rightStreak: number;
  /** Added on top of whichever of the above applies, for a flagged question. */
  flaggedBonus: number;
};

export const SMART_TEST_WEIGHTS: SmartTestWeights = {
  neverSeen: 3,
  wrongLastAttempt: 5,
  rightOnce: 1,
  rightStreak: 0.25,
  flaggedBonus: 2,
};

/**
 * A question last answered correctly within this many hours is excluded from
 * the draw — see the spacing rule in `smart-test.ts` — unless excluding it
 * would leave too few questions to fill the test.
 */
export const SMART_TEST_SPACING_HOURS = 24;
