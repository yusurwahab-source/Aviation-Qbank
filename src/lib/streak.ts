/**
 * The dashboard's "day streak" — consecutive calendar days with at least one
 * question answered, ending today or, if today has nothing on it yet,
 * yesterday. Pure, like `grading.ts` and `access-policy.ts`: the database
 * only has to supply which days had activity (`getPracticeDates` in
 * `db/dashboard.ts`); this decides what that means.
 *
 * Days are compared in UTC. A student's activity is stamped in UTC
 * throughout this application (see `attempts.answeredAt`), so this reads
 * the same calendar day the rest of the schema does — not necessarily the
 * day it was on the student's own clock, which nothing here tracks.
 */

function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
}

/**
 * `practiceDates` may be in any order and need not be de-duplicated — a
 * `Set` of day keys handles both. `today` defaults to now only for callers
 * that do not need to pin it; a test always passes one explicitly.
 *
 * A streak still open is not the same as one broken: someone who practised
 * every day through yesterday and has not yet opened the app today still has
 * a live streak, so the count starts from yesterday when today is empty
 * rather than reading as zero the moment midnight passes.
 */
export function computeStudyStreak(practiceDates: Date[], today: Date = new Date()): number {
  const days = new Set(practiceDates.map(dayKey));

  const cursor = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  if (!days.has(dayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
