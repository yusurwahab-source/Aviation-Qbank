import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Badge, Card, PageHeading } from "@/components/ui";
import { listGiftCodeRedemptions, listGiftCodesWithCounts } from "@/db/gift-codes";
import { isGiftCodeExpired } from "@/lib/billing/gift-codes";
import { requireOwner } from "@/lib/auth/require-owner";

import { DataTable, OwnerNav, OwnerPageError, formatDay } from "../../owner-ui";
import { DisableButton } from "../disable-button";

export const metadata: Metadata = { title: "Gift code" };
export const dynamic = "force-dynamic";

/**
 * One code's own page: what it is worth, who has redeemed it and when, and
 * the same disable control the list shows.
 *
 * There is no `getGiftCode(id)` query of its own — `listGiftCodesWithCounts`
 * already computes the redemption count and first-redeemer email this page
 * needs, and this list is small enough that finding one row in it costs
 * nothing worth a second query shape.
 */
export default async function OwnerGiftCodeDetailPage({
  params,
}: {
  params: Promise<{ giftCodeId: string }>;
}) {
  await requireOwner();
  const { giftCodeId } = await params;

  let code: Awaited<ReturnType<typeof listGiftCodesWithCounts>>[number] | undefined;
  let redemptions: Awaited<ReturnType<typeof listGiftCodeRedemptions>> = [];
  try {
    const codes = await listGiftCodesWithCounts();
    code = codes.find((row) => row.id === giftCodeId);
    if (code) redemptions = await listGiftCodeRedemptions(code.id);
  } catch (error) {
    console.error("Failed to load a gift code's detail:", error);
    return (
      <>
        <PageHeading eyebrow="Gift code" title="This code" />
        <OwnerNav current="/owner/gift-codes" />
        <OwnerPageError detail={(error as Error).message} />
      </>
    );
  }
  // Outside the try/catch: `notFound()` throws its own sentinel error, which
  // must reach Next's router unhandled, not be swallowed as a query failure.
  if (!code) notFound();

  const expired = isGiftCodeExpired(code.expiresAt);
  const exhausted = code.redemptionCount >= code.maxRedemptions;
  const live = !code.disabledAt && !expired && !exhausted;

  return (
    <>
      <PageHeading eyebrow="Gift code" title={code.code} subtitle={`Minted ${formatDay(code.createdAt)}.`} />
      <OwnerNav current="/owner/gift-codes" />

      <p className="mb-6">
        <Link href="/owner/gift-codes" className="text-sm text-brand hover:underline">
          ← Back to all codes
        </Link>
      </p>

      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Plan</dt>
              <dd className="mt-0.5 text-foreground">{code.plan}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Worth</dt>
              <dd className="mt-0.5 text-foreground">{code.durationDays} days</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Redemptions</dt>
              <dd className="mt-0.5 tabular-nums text-foreground">
                {code.redemptionCount} / {code.maxRedemptions}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Aircraft</dt>
              <dd className="mt-0.5 text-foreground">{code.unlocksAircraftCode ?? "All"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Expires</dt>
              <dd className="mt-0.5 text-foreground">
                {code.expiresAt ? formatDay(code.expiresAt) : "Never"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="mt-0.5">
                {code.disabledAt ? (
                  <Badge tone="incorrect">Disabled</Badge>
                ) : expired ? (
                  <Badge tone="incorrect">Expired</Badge>
                ) : exhausted ? (
                  <Badge tone="correct">Fully redeemed</Badge>
                ) : (
                  <Badge>Live</Badge>
                )}
              </dd>
            </div>
          </dl>
          {live ? <DisableButton giftCodeId={code.id} code={code.code} /> : null}
        </div>
        {code.note ? (
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            Note: {code.note}
          </p>
        ) : null}
      </Card>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Redemptions</h2>
      <DataTable
        headers={["Who", "When"]}
        empty="Nobody has redeemed this code yet."
        rowKey={(_row, index) => `${redemptions[index]?.email}-${index}`}
        rows={redemptions.map((redemption) => [
          <span key="email" className="break-all text-xs">
            {redemption.email}
          </span>,
          <span key="when" className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDay(redemption.redeemedAt)}
          </span>,
        ])}
      />
    </>
  );
}
