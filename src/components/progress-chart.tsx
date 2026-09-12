"use client";

import { useId, useMemo, useState } from "react";

import type { TestScore } from "@/db/reports";

/**
 * Score per test over time.
 *
 * Inline SVG rather than a charting library: one small line chart does not
 * justify a dependency, and this way the marks follow the house palette exactly.
 *
 * A single series, so there is no legend — the heading says what is plotted.
 * Colour comes from `--brand`, which clears 3:1 contrast against the card
 * surface in both themes. (The palette validator's lightness-band check is
 * scoped to categorical palettes, where it keeps several hues apart; with one
 * series there is nothing to separate it from.)
 */

const WIDTH = 720;
const HEIGHT = 240;
const PADDING = { top: 16, right: 16, bottom: 28, left: 36 };

const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function ProgressChart({ scores }: { scores: TestScore[] }) {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const points = useMemo(() => {
    if (scores.length === 0) return [];
    // One test sits in the middle rather than hard against the left edge.
    const step = scores.length === 1 ? 0 : PLOT_WIDTH / (scores.length - 1);
    return scores.map((score, i) => ({
      score,
      x: PADDING.left + (scores.length === 1 ? PLOT_WIDTH / 2 : i * step),
      y: PADDING.top + PLOT_HEIGHT * (1 - score.percentage / 100),
    }));
  }, [scores]);

  if (scores.length === 0) return null;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${PADDING.top + PLOT_HEIGHT} L ${points[0].x} ${PADDING.top + PLOT_HEIGHT} Z`
      : "";

  const active = hovered !== null ? points[hovered] : null;
  const latest = points[points.length - 1];

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full min-w-[320px]"
          role="img"
          aria-label={`Score for each of your last ${scores.length} tests, oldest first. Most recent: ${latest.score.percentage} percent.`}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Gridlines: hairline, solid, recessive. They carry the values that
              are not directly labelled. */}
          {[0, 25, 50, 75, 100].map((value) => {
            const y = PADDING.top + PLOT_HEIGHT * (1 - value / 100);
            return (
              <g key={value}>
                <line
                  x1={PADDING.left}
                  y1={y}
                  x2={WIDTH - PADDING.right}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="1"
                />
                <text
                  x={PADDING.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[var(--muted-foreground)] text-[11px]"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}

          {points.length > 1 ? (
            <path
              d={linePath}
              fill="none"
              stroke="var(--brand)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}

          {points.map((point, i) => (
            <g key={point.score.testSessionId}>
              {/* Generous invisible hit target — the visible dot is too small
                  to hover reliably, especially on a touch screen. */}
              <rect
                x={point.x - 18}
                y={PADDING.top}
                width={36}
                height={PLOT_HEIGHT}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onFocus={() => setHovered(i)}
                tabIndex={0}
                role="button"
                aria-label={`${formatDate(point.score.completedAt)}: ${point.score.percentage} percent, ${point.score.correct} of ${point.score.answered} correct`}
              />
              {/* 2px surface ring keeps the marker legible where it crosses
                  the line or another marker. */}
              <circle
                cx={point.x}
                cy={point.y}
                r={hovered === i ? 6 : 4}
                fill="var(--brand)"
                stroke="var(--surface)"
                strokeWidth="2"
              />
            </g>
          ))}

          {/* Only the endpoint is labelled. A number on every point goes unread. */}
          {!active ? (
            <text
              x={Math.min(latest.x + 10, WIDTH - PADDING.right)}
              y={Math.max(latest.y - 10, PADDING.top + 10)}
              textAnchor={latest.x > WIDTH - 80 ? "end" : "start"}
              className="fill-[var(--foreground)] text-[12px] font-semibold"
            >
              {latest.score.percentage}%
            </text>
          ) : null}

          <line
            x1={PADDING.left}
            y1={PADDING.top + PLOT_HEIGHT}
            x2={WIDTH - PADDING.right}
            y2={PADDING.top + PLOT_HEIGHT}
            stroke="var(--border)"
            strokeWidth="1"
          />

          <text
            x={PADDING.left}
            y={HEIGHT - 6}
            className="fill-[var(--muted-foreground)] text-[11px]"
          >
            {formatDate(scores[0].completedAt)}
          </text>
          {/* Only label the far end when it says something different — several
              tests in one sitting would otherwise print the same date twice. */}
          {scores.length > 1 &&
          formatDate(scores[scores.length - 1].completedAt) !== formatDate(scores[0].completedAt) ? (
            <text
              x={WIDTH - PADDING.right}
              y={HEIGHT - 6}
              textAnchor="end"
              className="fill-[var(--muted-foreground)] text-[11px]"
            >
              {formatDate(scores[scores.length - 1].completedAt)}
            </text>
          ) : null}
        </svg>
      </div>

      {/* Tooltip as HTML rather than SVG text, so it wraps and styles normally. */}
      <div className="mt-2 min-h-[1.5rem] text-sm" aria-live="polite">
        {active ? (
          <span className="text-foreground">
            <span className="font-semibold">{active.score.percentage}%</span>{" "}
            <span className="text-muted-foreground">
              — {active.score.correct} of {active.score.answered} correct on{" "}
              {formatDate(active.score.completedAt)}
              {active.score.aircraftCode ? ` · ${active.score.aircraftCode}` : ""}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">
            Hover or focus a point to see that test.
          </span>
        )}
      </div>

      {/* The table is the accessible equal of the chart, not an extra. */}
      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        className="mt-1 text-sm font-medium text-brand hover:underline"
        aria-expanded={showTable}
      >
        {showTable ? "Hide the numbers" : "Show the numbers"}
      </button>

      {showTable ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Score for each test, oldest first</caption>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">Date</th>
                <th scope="col" className="py-2 pr-4 font-medium">Aircraft</th>
                <th scope="col" className="py-2 pr-4 font-medium">Correct</th>
                <th scope="col" className="py-2 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => (
                <tr key={score.testSessionId} className="border-b border-border">
                  <td className="py-2 pr-4 text-foreground">
                    {score.completedAt.toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                    {score.aircraftCode}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {score.correct}/{score.answered}
                  </td>
                  <td className="py-2 font-medium text-foreground">{score.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
