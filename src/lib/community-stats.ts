/**
 * "X% of pilots get this right" — shown in the explanation card once enough
 * people have actually answered a question that the figure means something.
 *
 * Pure, like `grading.ts` and `access-policy.ts`: the caller supplies the
 * cached counts (`question_stats`, kept current by
 * `scripts/compute-question-stats.ts`, never computed per request — see the
 * note on that table in `schema.ts`), and this just decides what to show.
 */

/**
 * Below this many recorded first attempts, a percentage is more noise than
 * signal — three lucky or unlucky answers should not read as a fact about
 * the question. Hidden entirely below the threshold, not shown with a
 * caveat: a hedge nobody reads is no better than nothing.
 */
export const MIN_FIRST_ATTEMPTS_TO_SHOW = 20;

export type QuestionStat = { firstAttempts: number; firstAttemptsCorrect: number };

/**
 * The percentage to show, or null to hide the line entirely — below the
 * threshold, or for a question with no cached stat at all (never
 * recomputed, or every attempt on it happened after the last run).
 */
export function communityPercentCorrect(stat: QuestionStat | null | undefined): number | null {
  if (!stat || stat.firstAttempts < MIN_FIRST_ATTEMPTS_TO_SHOW) return null;
  return Math.round((stat.firstAttemptsCorrect / stat.firstAttempts) * 100);
}
