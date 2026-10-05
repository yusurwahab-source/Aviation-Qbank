"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui";
import {
  FIELD_LABELS,
  ROW_FIELDS,
  TOTALED_FIELDS,
  TOTALS_LINES,
  TOTALS_LINE_LABELS,
  emptyRow,
  type LogbookPage,
  type RowField,
  type TotaledField,
  type TotalsLineKey,
} from "@/lib/logbook/model";
import { applyFix, setCell, type CellRef, type Finding, type ValidationResult } from "@/lib/logbook/validate";

import { CellInput, type CellMark } from "./cell-input";
import { PhotoZoom } from "./photo-zoom";
import type { Spread } from "./scanner";

const SEVERITY_TONE = { error: "incorrect", warning: "warning", info: "neutral" } as const;
const SEVERITY_RANK = { error: 0, warning: 1, info: 2 } as const;

export function cellId(cell: CellRef): string {
  return cell.kind === "row"
    ? `cell-${cell.page}-r${cell.row}-${cell.field}`
    : `cell-${cell.page}-t${cell.line}-${cell.field}`;
}

function cellKey(cell: CellRef): string {
  return cell.kind === "row" ? `r:${cell.row}:${cell.field}` : `t:${cell.line}:${cell.field}`;
}

function where(finding: Finding): string {
  const cell = finding.cell;
  if (!cell) return finding.row === null ? "Page" : `Row ${finding.row + 1}`;
  if (cell.kind === "row") return `Row ${cell.row + 1} · ${FIELD_LABELS[cell.field]}`;
  return `${TOTALS_LINE_LABELS[cell.line]} · ${FIELD_LABELS[cell.field]}`;
}

function focusCell(cell: CellRef | null) {
  if (!cell) return;
  const element = document.getElementById(cellId(cell));
  if (element instanceof HTMLInputElement) {
    element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    element.focus({ preventScroll: true });
    element.select();
  }
}

/**
 * One spread under review: its photo, what was found on it, and the page as
 * an editable table. Every edit goes back up through `onPage`, which re-runs
 * the whole validation in the parent — so a carry-forward on the next page
 * updates the moment this page's total changes.
 */
export function ReviewPage({
  index,
  spread,
  result,
  onPage,
  onIgnore,
}: {
  index: number;
  spread: Spread;
  result: ValidationResult;
  onPage: (page: LogbookPage) => void;
  onIgnore: (key: string, ignored: boolean) => void;
}) {
  const [showIgnored, setShowIgnored] = useState(false);
  const page = spread.page;
  const ignored = useMemo(() => new Set(spread.ignored), [spread.ignored]);

  const findings = result.findings
    .filter((finding) => finding.page === index)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  const active = findings.filter((finding) => !ignored.has(finding.key));
  const ignoredFindings = findings.filter((finding) => ignored.has(finding.key));

  const marks = new Map<string, CellMark>();
  {
    const map = marks;
    for (const finding of active) {
      if (!finding.cell || finding.severity === "info") continue;
      const key = cellKey(finding.cell);
      const mark = map.get(key) ?? { severity: null, doubtful: false };
      if (finding.check === "low-confidence") mark.doubtful = true;
      else if (finding.severity === "error" || mark.severity === null) mark.severity = finding.severity;
      map.set(key, mark);
    }
  }

  // Doubtful readings stay underlined even once their "please verify" is
  // ignored, until the value is edited — that is what clears the doubt.
  const markFor = (cell: CellRef): CellMark => {
    const mark = { ...(marks.get(cellKey(cell)) ?? { severity: null, doubtful: false }) };
    if (cell.kind === "row" && page.rows[cell.row]?.confidence[cell.field]) mark.doubtful = true;
    if (cell.kind === "total" && page.totals_confidence[`${cell.line}.${cell.field}`]) mark.doubtful = true;
    return mark;
  };

  const commit = (cell: CellRef, value: number | string | null) => onPage(setCell([page], { ...cell, page: 0 }, value)[0]);

  const toggleStruck = (row: number) =>
    onPage({
      ...page,
      rows: page.rows.map((r, i) => (i === row ? { ...r, struck_through: !r.struck_through } : r)),
    });

  const counts = { error: 0, warning: 0 };
  for (const finding of active) if (finding.severity !== "info") counts[finding.severity] += 1;

  return (
    <section aria-labelledby={`page-${spread.key}`} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={`page-${spread.key}`} className="text-lg font-semibold text-foreground">
          Page {index + 1}
        </h2>
        <Badge tone={counts.error ? "incorrect" : "correct"}>
          {counts.error} {counts.error === 1 ? "error" : "errors"}
        </Badge>
        <Badge tone={counts.warning ? "warning" : "neutral"}>
          {counts.warning} {counts.warning === 1 ? "warning" : "warnings"}
        </Badge>
      </div>

      {spread.photoUrl ? (
        <PhotoZoom src={spread.photoUrl} alt={`Photo of logbook page ${index + 1}`} />
      ) : (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          Photos are never stored, so this saved page has no photo. Compare it with your paper logbook.
        </p>
      )}
      {spread.note ? (
        <p className="rounded-lg bg-warning-soft p-3 text-sm text-warning">About this photo: {spread.note}</p>
      ) : null}

      {active.length > 0 ? (
        <ul className="space-y-2">
          {active.map((finding) => (
            <li key={finding.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={SEVERITY_TONE[finding.severity]}>{finding.severity}</Badge>
                <span className="text-xs font-medium text-muted-foreground">{where(finding)}</span>
              </div>
              <p className="mt-1.5 text-sm text-foreground">{finding.message}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {finding.fix ? (
                  <button
                    type="button"
                    onClick={() => onPage(applyFix([page], { ...finding.fix!, cell: { ...finding.fix!.cell, page: 0 } })[0])}
                    className="min-h-9 rounded-lg bg-brand px-3 text-xs font-semibold text-on-solid hover:bg-brand-strong"
                    title={finding.fix.label}
                  >
                    Accept fix: {finding.fix.label}
                  </button>
                ) : null}
                {finding.cell || finding.fix ? (
                  <button
                    type="button"
                    onClick={() => focusCell(finding.fix?.cell ?? finding.cell)}
                    className="min-h-9 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:border-brand"
                  >
                    Edit
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onIgnore(finding.key, true)}
                  className="min-h-9 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground hover:border-brand"
                >
                  Ignore (it&apos;s correct)
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-correct-soft p-3 text-sm text-correct">Nothing to check on this page.</p>
      )}

      {ignoredFindings.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setShowIgnored((value) => !value)}
            className="link-standalone text-xs font-medium text-muted-foreground hover:underline"
          >
            {showIgnored ? "Hide" : "Show"} {ignoredFindings.length} ignored
          </button>
          {showIgnored ? (
            <ul className="mt-2 space-y-1">
              {ignoredFindings.map((finding) => (
                <li key={finding.id} className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {where(finding)} — {finding.message}
                  </span>
                  <button
                    type="button"
                    onClick={() => onIgnore(finding.key, false)}
                    className="shrink-0 font-medium text-brand-ink hover:underline"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="scroll-x rounded-lg border border-border">
        <table className="min-w-max border-collapse text-xs">
          <thead className="bg-surface-muted text-muted-foreground">
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-surface-muted px-2 py-2 text-left">
                #
              </th>
              <th scope="col" className="px-1 py-2 text-left" title="Crossed out">
                Struck
              </th>
              {ROW_FIELDS.map((field) => (
                <th key={field} scope="col" className="px-1 py-2 text-left font-medium whitespace-nowrap">
                  {FIELD_LABELS[field]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row, r) => (
              <tr key={r} className={`border-t border-border ${row.struck_through ? "opacity-50" : ""}`}>
                <th scope="row" className="sticky left-0 z-10 bg-surface px-2 text-left font-medium text-muted-foreground">
                  {r + 1}
                </th>
                <td className="px-1 text-center">
                  <input
                    type="checkbox"
                    checked={row.struck_through}
                    onChange={() => toggleStruck(r)}
                    aria-label={`Row ${r + 1} is crossed out`}
                    className="h-4 w-4"
                  />
                </td>
                {ROW_FIELDS.map((field) => {
                  const cell: CellRef = { kind: "row", page: index, row: r, field };
                  return (
                    <td key={field} className="px-0.5 py-0.5">
                      <CellInput
                        id={cellId(cell)}
                        field={field}
                        value={row[field]}
                        mark={markFor(cell)}
                        label={`Row ${r + 1}, ${FIELD_LABELS[field]}`}
                        onCommit={(value) => commit(cell, value)}
                        wide={field === "remarks"}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-surface-muted">
            {TOTALS_LINES.map((line) => (
              <TotalsRow key={line} index={index} line={line} page={page} markFor={markFor} commit={commit} />
            ))}
          </tfoot>
        </table>
      </div>
      <button
        type="button"
        onClick={() => onPage({ ...page, rows: [...page.rows, emptyRow()] })}
        className="min-h-9 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:border-brand"
      >
        Add a row the scan missed
      </button>
    </section>
  );
}

function TotalsRow({
  index,
  line,
  page,
  markFor,
  commit,
}: {
  index: number;
  line: TotalsLineKey;
  page: LogbookPage;
  markFor: (cell: CellRef) => CellMark;
  commit: (cell: CellRef, value: number | string | null) => void;
}) {
  return (
    <tr className="border-t border-border">
      <th
        scope="row"
        colSpan={2 + ROW_FIELDS.indexOf("se")}
        className="sticky left-0 z-10 bg-surface-muted px-2 py-1 text-left font-semibold whitespace-nowrap text-foreground"
      >
        {TOTALS_LINE_LABELS[line]}
      </th>
      {ROW_FIELDS.slice(ROW_FIELDS.indexOf("se")).map((field) => {
        if (!(TOTALED_FIELDS as readonly string[]).includes(field)) return <td key={field} />;
        const totaled = field as TotaledField;
        const cell: CellRef = { kind: "total", page: index, line, field: totaled };
        const mark = markFor(cell);
        return (
          <td key={field} className="px-0.5 py-0.5">
            <CellInput
              id={cellId(cell)}
              field={field as RowField}
              value={page.printed_totals[line][totaled]}
              mark={mark}
              label={`${TOTALS_LINE_LABELS[line]}, ${FIELD_LABELS[totaled]}`}
              onCommit={(value) => commit(cell, value)}
            />
          </td>
        );
      })}
    </tr>
  );
}
