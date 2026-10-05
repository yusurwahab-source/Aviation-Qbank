"use client";

import { Card } from "@/components/ui";
import { toCsv } from "@/lib/logbook/export/csv";
import { toJson } from "@/lib/logbook/export/json";
import { toPdf } from "@/lib/logbook/export/pdf";
import { EXPORT_DISCLAIMER, displayValue } from "@/lib/logbook/export/table";
import { toXlsx } from "@/lib/logbook/export/xlsx";
import { FIELD_LABELS, TOTALS_LINE_LABELS, type RowField } from "@/lib/logbook/model";
import { paperCorrections, summarize, type PaperCorrection } from "@/lib/logbook/summary";
import { formatDuration } from "@/lib/logbook/time";

import { download, safeFilename } from "./download";
import type { Spread } from "./scanner";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function correctionLabel(correction: PaperCorrection): string {
  return correction.kind === "row"
    ? `Row ${correction.row + 1} · ${FIELD_LABELS[correction.field]}`
    : `${TOTALS_LINE_LABELS[correction.line]} · ${FIELD_LABELS[correction.field]}`;
}

/**
 * Phase 4: what the verified logbook adds up to, how to make the paper agree
 * with it, and the files to take away. Everything here is computed from the
 * reviewed pages in the browser; nothing is sent anywhere.
 */
export function Results({
  name,
  spreads,
  onDone,
}: {
  name: string;
  spreads: Spread[];
  onDone: (index: number, done: boolean) => void;
}) {
  const pages = spreads.map((spread) => spread.page);
  const summary = summarize(pages);
  const corrections = paperCorrections(
    spreads.map((spread) => spread.original),
    pages,
  );
  const t = summary.totals;
  const file = safeFilename(name);

  return (
    <div className="space-y-8">
      <section aria-labelledby="totals-heading">
        <h2 id="totals-heading" className="mb-3 text-lg font-semibold text-foreground">
          Totals
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total time" value={formatDuration(t.total_time)} />
          <Stat label="PIC" value={formatDuration(t.pic)} />
          <Stat label="Dual" value={formatDuration(t.dual)} />
          <Stat label="Co-pilot" value={formatDuration(t.copilot)} />
          <Stat label="Instructor" value={formatDuration(t.instructor)} />
          <Stat label="IFR" value={formatDuration(t.ifr)} />
          <Stat label="Night" value={formatDuration(t.night)} />
          <Stat label="Single-engine" value={formatDuration(t.se)} />
          <Stat label="Multi-engine" value={formatDuration(t.me)} />
          <Stat label="Multi-pilot" value={formatDuration(t.multi_pilot)} />
          <Stat label="Landings, day" value={String(t.landings_day)} />
          <Stat label="Landings, night" value={String(t.landings_night)} />
        </div>
        {summary.broughtForward.total_time > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Includes {formatDuration(summary.broughtForward.total_time)} brought forward onto the first scanned page.
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card padding="p-4">
            <h3 className="font-semibold text-foreground">Cross-country</h3>
            <p className="mt-1 text-xs text-muted-foreground">Flights where departure and arrival differ.</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="text-right font-semibold tabular-nums">{formatDuration(summary.crossCountry.total)}</dd>
              <dt className="text-muted-foreground">As PIC</dt>
              <dd className="text-right tabular-nums">{formatDuration(summary.crossCountry.pic)}</dd>
              <dt className="text-muted-foreground">Dual</dt>
              <dd className="text-right tabular-nums">{formatDuration(summary.crossCountry.dual)}</dd>
              <dt className="text-muted-foreground">VFR</dt>
              <dd className="text-right tabular-nums">{formatDuration(summary.crossCountry.vfr)}</dd>
              <dt className="text-muted-foreground">IFR</dt>
              <dd className="text-right tabular-nums">{formatDuration(summary.crossCountry.ifr)}</dd>
            </dl>
          </Card>
          <Card padding="p-4">
            <h3 className="font-semibold text-foreground">Last 90 days</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Landings dated {summary.last90Days.from} to {summary.last90Days.to}.
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Day landings</dt>
              <dd className="text-right font-semibold tabular-nums">{summary.last90Days.day}</dd>
              <dt className="text-muted-foreground">Night landings</dt>
              <dd className="text-right font-semibold tabular-nums">{summary.last90Days.night}</dd>
            </dl>
          </Card>
        </div>

        {summary.byType.length > 0 ? (
          <Card className="mt-4" padding="p-4">
            <h3 className="font-semibold text-foreground">By aircraft type</h3>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="py-1 font-medium">Type</th>
                  <th scope="col" className="py-1 text-right font-medium">Flights</th>
                  <th scope="col" className="py-1 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {summary.byType.map((row) => (
                  <tr key={row.type} className="border-t border-border">
                    <td className="py-1.5 font-medium text-foreground">{row.type}</td>
                    <td className="py-1.5 text-right tabular-nums">{row.flights}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatDuration(row.minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : null}
      </section>

      <section aria-labelledby="fix-heading">
        <h2 id="fix-heading" className="text-lg font-semibold text-foreground">
          Fix my paper logbook
        </h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">
          Page by page, the cells to correct on paper. The new value is large; the one written now is small and
          struck through. Follow your authority&apos;s rules for corrections — usually a single line through, initialled.
        </p>
        <ol className="space-y-3">
          {spreads.map((spread, p) => {
            const list = corrections[p];
            return (
              <li key={spread.key}>
                <Card padding="p-4" className={spread.done ? "opacity-60" : ""}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-foreground">Page {p + 1}</h3>
                    <label className="flex min-h-11 items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={spread.done}
                        onChange={(event) => onDone(p, event.target.checked)}
                        className="h-5 w-5"
                      />
                      Page done
                    </label>
                  </div>
                  {list.length === 0 ? (
                    <p className="mt-1 text-sm text-correct">Nothing to change on this page.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-border">
                      {list.map((correction) => {
                        const field = correction.field as RowField;
                        const oldText = displayValue(field, correction.old) || "blank";
                        const newText = displayValue(field, correction.value) || "leave blank";
                        return (
                          <li
                            key={`${correction.kind}-${correctionLabel(correction)}`}
                            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
                          >
                            <span className="text-sm text-muted-foreground">{correctionLabel(correction)}</span>
                            <span className="flex items-baseline gap-3">
                              <s className="text-xs text-muted-foreground">{oldText}</s>
                              <span className="text-2xl font-semibold tabular-nums text-foreground">{newText}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="export-heading">
        <h2 id="export-heading" className="text-lg font-semibold text-foreground">
          Export
        </h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">{EXPORT_DISCLAIMER}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ExportButton onClick={() => download(toPdf(pages, name) as BlobPart, `${file}.pdf`, "application/pdf")}>
            PDF (logbook layout)
          </ExportButton>
          <ExportButton
            onClick={() =>
              download(
                toXlsx(pages) as BlobPart,
                `${file}.xlsx`,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              )
            }
          >
            Excel (XLSX)
          </ExportButton>
          <ExportButton onClick={() => download(toCsv(pages), `${file}.csv`, "text/csv;charset=utf-8")}>CSV</ExportButton>
          <ExportButton onClick={() => download(toJson(pages, name), `${file}.json`, "application/json")}>
            JSON
          </ExportButton>
        </div>
      </section>
    </div>
  );
}

function ExportButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-target rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition hover:border-brand hover:text-brand-ink"
    >
      {children}
    </button>
  );
}
