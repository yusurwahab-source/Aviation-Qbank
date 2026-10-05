import type { LogbookPage } from "../model";
import { computeRunningTotals } from "../validate";
import { EXPORT_DISCLAIMER } from "./table";

/** The whole reviewed logbook, times in minutes, with the corrected
 * running totals beside what was printed. */
export function toJson(pages: LogbookPage[], name: string): string {
  const running = computeRunningTotals(pages);
  return JSON.stringify(
    {
      disclaimer: EXPORT_DISCLAIMER,
      name,
      generatedAt: new Date().toISOString(),
      units: { durations: "minutes", clockTimes: "minutes after midnight" },
      pages: pages.map((page, p) => ({
        page: p + 1,
        rows: page.rows.map((row) => {
          const copy: Partial<typeof row> = { ...row };
          delete copy.confidence;
          return copy;
        }),
        printedTotals: page.printed_totals,
        correctedTotals: running[p],
      })),
    },
    null,
    2,
  );
}
