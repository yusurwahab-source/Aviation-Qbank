import type { Metadata } from "next";

import { Badge, Card, PageHeading } from "@/components/ui";
import { getLogbookUsage, listRecentExtractions } from "@/db/logbook-owner";
import { requireOwner } from "@/lib/auth/require-owner";
import { envValue } from "@/lib/env";
import { logbookPurchasesEnabled, logbookScannerConfigured } from "@/lib/logbook/config";
import { DEFAULT_LOGBOOK_MODEL, formatMicroUsd } from "@/lib/logbook/pricing";

import { DataTable, OwnerNav, OwnerPageError, StatTile, renderOwnerPage } from "../owner-ui";
import { GrantUnlocksForm } from "./grant-form";

export const metadata: Metadata = { title: "Logbook Scanner" };
export const dynamic = "force-dynamic";

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Logbook Scanner from the owner's side: what the model has cost, request
 * by request, and a way to hand someone an unlock. Token counts and cost
 * are logged here and nowhere a student can see them.
 */
export default async function OwnerLogbookPage() {
  return renderOwnerPage(
    async () => {
      await requireOwner();
      const [usage, recent] = await Promise.all([getLogbookUsage(), listRecentExtractions()]);
      const model = envValue("LOGBOOK_MODEL") ?? DEFAULT_LOGBOOK_MODEL;

      return (
        <>
          <PageHeading
            title="Logbook Scanner"
            subtitle={`Model: ${model}. ${logbookScannerConfigured() ? "Scanning is on." : "ANTHROPIC_API_KEY is not set — scanning is off."} Purchases ${logbookPurchasesEnabled() ? "shown" : "hidden"} (LOGBOOK_PURCHASES_ENABLED).`}
          />
          <OwnerNav current="/owner/logbook" />

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Spreads read, last 30 days" value={usage.last30Days.extractions} />
            <StatTile label="Cost, last 30 days" value={formatMicroUsd(usage.last30Days.costMicroUsd)} />
            <StatTile label="Spreads read, all time" value={usage.allTime.extractions} />
            <StatTile label="Cost, all time" value={formatMicroUsd(usage.allTime.costMicroUsd)} />
            <StatTile label="Failed extractions" value={usage.allTime.failed} />
            <StatTile
              label="Average cost per spread"
              value={
                usage.allTime.extractions > 0
                  ? formatMicroUsd(Math.round(usage.allTime.costMicroUsd / usage.allTime.extractions))
                  : "—"
              }
            />
            <StatTile label="Logbooks unlocked" value={`${usage.unlocked} of ${usage.logbooks}`} />
            <StatTile label="Unspent unlocks held" value={usage.unusedCredits} />
          </div>
          {usage.allTime.unpricedExtractions > 0 ? (
            <p className="mb-6 text-xs text-muted-foreground">
              {usage.allTime.unpricedExtractions} requests ran on a model with no price in
              `lib/logbook/pricing.ts`; their cost is not included above.
            </p>
          ) : null}

          <Card className="mb-8">
            <h2 className="mb-3 font-semibold text-foreground">Grant unlocks</h2>
            <GrantUnlocksForm />
            <p className="mt-3 text-xs text-muted-foreground">
              Or mint license codes that grant an unlock under Gift codes.
            </p>
          </Card>

          <h2 className="mb-3 font-semibold text-foreground">Recent requests</h2>
          <DataTable
            headers={["When", "Account", "Status", "Tokens in / out", "Cost", "Time"]}
            empty="No logbook pages scanned yet."
            rows={recent.map((row) => [
              timeFormat.format(row.createdAt),
              <span key="email" className="break-all">
                {row.email}
              </span>,
              <span key="status" className="flex flex-col gap-1">
                <Badge tone={row.status === "ok" ? "correct" : row.status === "failed" ? "incorrect" : "neutral"}>
                  {row.status} · {row.chargedTo}
                </Badge>
                {row.error ? <span className="text-xs text-muted-foreground">{row.error}</span> : null}
              </span>,
              <span key="tokens" className="tabular-nums">
                {(row.inputTokens + row.cacheReadTokens).toLocaleString("en-GB")} /{" "}
                {row.outputTokens.toLocaleString("en-GB")}
                {row.attempts > 1 ? ` (${row.attempts} tries)` : ""}
              </span>,
              <span key="cost" className="tabular-nums">
                {formatMicroUsd(row.costMicroUsd)}
              </span>,
              row.durationMs ? `${(row.durationMs / 1000).toFixed(1)} s` : "—",
            ])}
          />
        </>
      );
    },
    (detail) => (
      <>
        <PageHeading title="Logbook Scanner" />
        <OwnerNav current="/owner/logbook" />
        <OwnerPageError detail={detail} />
      </>
    ),
  );
}
