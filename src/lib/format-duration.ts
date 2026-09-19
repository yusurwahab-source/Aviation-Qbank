/**
 * "2h 15m" — the dashboard header's total-study-time figure. Separate from
 * `formatClock` in `test-options.ts`, which renders a single test's clock
 * (`m:ss`, counting towards or down from a specific limit); this is for a
 * running total across every test ever taken, where nobody wants to read
 * "740m" and do the division themselves.
 */
export function formatStudyDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0 && minutes === 0) return "Less than a minute";
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
