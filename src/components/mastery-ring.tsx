/**
 * A single percentage, as a ring — "overall mastery" per aircraft on the
 * dashboard. Inline SVG, the same reasoning `ProgressChart` already gives
 * for not adding a charting dependency: one value does not need one either,
 * and this way the stroke is the house accent, not a library's default.
 *
 * Coloured the same way `ScoreBar`'s `score` tone already is — correct at
 * 80%+, the brand accent in the middle band, incorrect below half — so a
 * ring and a bar never disagree about what "doing well" looks like.
 */
export function MasteryRing({
  percentage,
  size = 96,
  strokeWidth = 10,
  label,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  /** Overrides the default `aria-label`; the visible `%` is not read by
   * itself as enough context for a screen reader. */
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color =
    clamped >= 80 ? "var(--correct)" : clamped >= 50 ? "var(--brand)" : "var(--incorrect)";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label ?? `${clamped}% mastered`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--surface-muted)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        // Starts at 12 o'clock rather than 3 o'clock, and grows clockwise.
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-[var(--foreground)] font-semibold"
        style={{ fontSize: size * 0.22 }}
      >
        {clamped}%
      </text>
    </svg>
  );
}
