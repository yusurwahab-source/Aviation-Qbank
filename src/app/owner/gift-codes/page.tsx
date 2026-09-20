import Link from "next/link";
import type { Metadata } from "next";

import { Badge, Card, PageHeading } from "@/components/ui";
import { listGiftCodesWithCounts } from "@/db/gift-codes";
import { listAircraft } from "@/db/queries";
import { isGiftCodeExpired } from "@/lib/billing/gift-codes";
import { requireOwner } from "@/lib/auth/require-owner";

import { DataTable, OwnerNav, OwnerPageError, formatDay } from "../owner-ui";
import { DisableButton } from "./disable-button";
import { GenerateForm } from "./generate-form";

export const metadata: Metadata = { title: "Gift codes" };
export const dynamic = "force-dynamic";

/**
 * Minting license keys, and seeing what became of the ones already minted.
 *
 * The list matters as much as the form: a code handed out and never
 * redeemed is the common case worth chasing, and without this the only
 * record of it was whatever the owner did with the printed output.
 */
export default async function OwnerGiftCodesPage() {
  await requireOwner();

  let codes: Awaited<ReturnType<typeof listGiftCodesWithCounts>>;
  let fleet: Awaited<ReturnType<typeof listAircraft>>;
  try {
    [codes, fleet] = await Promise.all([listGiftCodesWithCounts(), listAircraft()]);
  } catch (error) {
    console.error("Failed to load gift codes:", error);
    return (
      <>
        <PageHeading title="Gift codes" />
        <OwnerNav current="/owner/gift-codes" />
        <OwnerPageError detail={(error as Error).message} />
      </>
    );
  }

  const fullyRedeemed = codes.filter((code) => code.redemptionCount >= code.maxRedemptions).length;

  return (
    <>
      <PageHeading
        title="Gift codes"
        subtitle="Each code grants full access once redeemed, for as many days as you choose."
      />
      <OwnerNav current="/owner/gift-codes" />

      <Card className="mb-6">
        <GenerateForm aircraftCodes={fleet.map((plane) => plane.code)} />
      </Card>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          All codes{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({fullyRedeemed} of {codes.length} fully redeemed)
          </span>
        </h2>
        <Link
          href="/owner/gift-codes/export"
          className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-brand hover:text-brand"
        >
          Download all as CSV
        </Link>
      </div>

      <DataTable
        headers={["Code", "Worth", "Redemptions", "Status", "Note", "Minted"]}
        empty="No codes minted yet. Generate one above."
        rowKey={(_row, index) => codes[index]?.id ?? index}
        rows={codes.map((code) => {
          const expired = isGiftCodeExpired(code.expiresAt);
          const exhausted = code.redemptionCount >= code.maxRedemptions;
          const live = !code.disabledAt && !expired && !exhausted;

          return [
            <span key="code">
              <Link href={`/owner/gift-codes/${code.id}`} className="font-mono text-xs text-brand hover:underline">
                {code.code}
              </Link>
              {code.unlocksAircraftCode ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {code.unlocksAircraftCode} only
                </span>
              ) : null}
            </span>,
            `${code.durationDays} days`,
            <span key="redemptions" className="tabular-nums">
              {code.redemptionCount} / {code.maxRedemptions}
            </span>,
            <span key="status">
              {code.disabledAt ? (
                <Badge tone="incorrect">Disabled</Badge>
              ) : expired ? (
                <Badge tone="incorrect">Expired</Badge>
              ) : exhausted ? (
                <Badge tone="correct">Fully redeemed</Badge>
              ) : (
                <Badge>Live</Badge>
              )}
              {code.expiresAt ? (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {expired ? "expired" : "expires"} {formatDay(code.expiresAt)}
                </span>
              ) : null}
              {live ? (
                <div className="mt-1.5">
                  <DisableButton giftCodeId={code.id} code={code.code} />
                </div>
              ) : null}
            </span>,
            <span key="note" className="text-xs text-muted-foreground">
              {code.note ?? "—"}
            </span>,
            <span key="minted" className="whitespace-nowrap text-xs text-muted-foreground">
              {formatDay(code.createdAt)}
            </span>,
          ];
        })}
      />
    </>
  );
}
