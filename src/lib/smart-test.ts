import {
  SMART_TEST_SPACING_HOURS,
  SMART_TEST_WEIGHTS,
  type SmartTestWeights,
} from "./smart-test-config";

/**
 * Smart test: adaptive question selection.
 *
 * ────────────────────────────────────────────────────────────────────────
 * THE ALGORITHM
 *
 * 1. **Weight**, from how the student's history with that question stands
 *    right now (`weightFor` below), read off `SMART_TEST_WEIGHTS`:
 *
 *      never attempted before          → `neverSeen`      (default 3)
 *      wrong on the most recent attempt → `wrongLastAttempt` (default 5)
 *      right, but not two in a row yet  → `rightOnce`      (default 1)
 *      right, two or more times running → `rightStreak`    (default 0.25)
 *
 *    A flagged question adds `flaggedBonus` on top of whichever of those it
 *    started from — flagging means "show me this again", independently of
 *    how it was last answered.
 *
 * 2. **Spacing.** A question last answered correctly within
 *    `SMART_TEST_SPACING_HOURS` (default 24) is left out of the draw
 *    entirely (`isRecentlyCorrect`): it was only just confirmed, and
 *    drilling it again today teaches nothing new. This rule stands down —
 *    the full pool is used instead, recently-correct questions included —
 *    the moment applying it would leave fewer candidates than the test
 *    needs. A test one question short of what was asked for is a worse
 *    trade than one repeated question.
 *
 * 3. **Weighted sampling without replacement**, by the Efraimidis–Spirakis
 *    method: every candidate gets a key `u ** (1 / weight)` for a fresh
 *    `u` drawn uniformly from `[0, 1)`, and the questions with the highest
 *    `count` keys are the ones drawn. A heavier question is *more likely*
 *    to come up, never *guaranteed* to — so a "wrong last time" question
 *    with weight 5 does not lock in place across every smart test until it
 *    is finally answered right, and a comfortable weight-0.25 question can
 *    still turn up now and then. This runs in one pass over the candidate
 *    list with no repeated shuffling or rejection sampling.
 *
 * Pure and synchronous throughout: every fact this needs about a question —
 * never seen, last outcome, streak, flagged, when it was last answered
 * correctly — is supplied by the caller as a `QuestionSignal`. The one
 * query that gathers those facts, `getSmartTestSignals` in
 * `db/smart-test.ts`, is the only part of this feature that touches the
 * database; this module can be tuned and unit tested with none in the loop.
 * ────────────────────────────────────────────────────────────────────────
 */

/** Everything the weighting rule needs to know about one candidate question. */
export type QuestionSignal = {
  questionId: string;
  /** No `attempts` row exists for this student and this question at all. */
  neverSeen: boolean;
  /** Null exactly when `neverSeen` is true. */
  lastCorrect: boolean | null;
  /**
   * How many of the most recent attempts, counting back from the latest,
   * were correct in an unbroken run. 0 whenever the latest attempt was
   * wrong, and 0 for a question never seen — a streak is something a
   * question has, not something its absence has a lot of.
   */
  correctStreak: number;
  /** When the most recent attempt was answered. Null exactly when `neverSeen` is true. */
  lastAnsweredAt: Date | null;
  flagged: boolean;
};

/** The base weight before the flagged bonus, from the rules above. */
export function baseWeightFor(
  signal: Pick<QuestionSignal, "neverSeen" | "lastCorrect" | "correctStreak">,
  weights: SmartTestWeights = SMART_TEST_WEIGHTS,
): number {
  if (signal.neverSeen) return weights.neverSeen;
  if (signal.lastCorrect === false) return weights.wrongLastAttempt;
  if (signal.correctStreak >= 2) return weights.rightStreak;
  return weights.rightOnce;
}

/** The full weight a question draws with: base rule plus the flagged bonus. */
export function weightFor(
  signal: QuestionSignal,
  weights: SmartTestWeights = SMART_TEST_WEIGHTS,
): number {
  const weight = baseWeightFor(signal, weights) + (signal.flagged ? weights.flaggedBonus : 0);
  // Weighted sampling divides by the weight, so it must never reach zero.
  // Nothing in `SMART_TEST_WEIGHTS` is zero or negative, but a hand-edited
  // config could get this wrong — this is a floor against that, not a
  // tuning knob of its own.
  return Math.max(weight, 0.01);
}

/** Whether the spacing rule would exclude this question from a fresh draw. */
export function isRecentlyCorrect(
  signal: Pick<QuestionSignal, "lastCorrect" | "lastAnsweredAt">,
  now: Date,
  spacingHours: number = SMART_TEST_SPACING_HOURS,
): boolean {
  if (signal.lastCorrect !== true || signal.lastAnsweredAt === null) return false;
  return now.getTime() - signal.lastAnsweredAt.getTime() < spacingHours * 60 * 60 * 1000;
}

/**
 * Draws up to `count` question ids out of `signals`, weighted as documented
 * above. Returns fewer than `count` only when `signals` itself is smaller
 * than that — the same "give what exists, honestly" rule the rest of the
 * test builder follows (see `resolveTestSize` in `test-options.ts`).
 *
 * `random` defaults to `Math.random` and exists so a test can supply a
 * seeded generator instead of asserting on chance.
 */
export function selectSmartTestQuestions(
  signals: QuestionSignal[],
  count: number,
  options: {
    now?: Date;
    weights?: SmartTestWeights;
    spacingHours?: number;
    random?: () => number;
  } = {},
): string[] {
  if (count <= 0 || signals.length === 0) return [];

  const now = options.now ?? new Date();
  const weights = options.weights ?? SMART_TEST_WEIGHTS;
  const spacingHours = options.spacingHours ?? SMART_TEST_SPACING_HOURS;
  const random = options.random ?? Math.random;

  const rested = signals.filter((signal) => !isRecentlyCorrect(signal, now, spacingHours));
  // "Excluded unless the pool is exhausted": the spacing rule only holds
  // while there is still enough left afterwards to fill the test.
  const pool = rested.length >= count ? rested : signals;

  const keyed = pool.map((signal) => {
    const weight = weightFor(signal, weights);
    // `random()` returns a value in [0, 1); a bare 0 would give a key of 0
    // regardless of weight, tying every such draw at the bottom rather than
    // spreading them by weight — nudged into (0, 1) instead.
    const u = random() || Number.EPSILON;
    return { questionId: signal.questionId, key: u ** (1 / weight) };
  });

  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, count).map((entry) => entry.questionId);
}
