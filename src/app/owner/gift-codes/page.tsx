import type { Metadata } from "next";

import { Badge, Card, PageHeading } from "@/components/ui";
import { listGiftCodes } from "@/db/owner";
import { requireOwner } from "@/lib/auth/require-owner";

import { DataTable, OwnerNav, formatDay } from "../owner-ui";
import { GenerateForm } from "./generate-form";

export const metadata: Metadata = { title: "Gift codes" };
export const dynamic = "force-dynamic";

/**
 * Minting codes, and seeing what became of the ones already minted.
 *
 * The list matters as much as the form: a code handed out and never
 * redeemed is the common case worth chasing, and without this the only
 * record of it was whatever the owner did with the printed output.
 */
export default async function OwnerGiftCodesPage() {
  await requireOwner();
  const codes = await listGiftCodes();

  const redeemed = codes.filter((code) => code.redeemedAt !== null).length;

  return (
    <>
      <PageHeading
        title="Gift codes"
        subtitle="Each code grants full access once redeemed, for as many days as you choose."
      />
      <OwnerNav current="/owner/gift-codes" />

      <Card className="mb-6">
        <GenerateForm />
      </Card>

      <h2 className="mb-3 text-lg font-semibold text-foreground">
        All codes{" "}
        <span className="text-sm font-normal text-muted-foreground">
          ({redeemed} of {codes.length} redeemed)
        </span>
      </h2>

      <DataTable
        headers={["Code", "Worth", "Status", "Note", "Minted"]}
        empty="No codes minted yet. Generate one above."
        rows={codes.map((code) => [
          <span key="code" className="font-mono text-xs">
            {code.code}
          </span>,
          `${code.durationDays} days`,
          code.redeemedAt ? (
            <span key="status">
              <Badge tone="correct">Redeemed</Badge>
              <span className="mt-1 block text-xs text-muted-foreground">
                {code.redeemedByEmail ?? "account deleted"} · {formatDay(code.redeemedAt)}
              </span>
            </span>
          ) : (
            <Badge key="status">Unused</Badge>
          ),
          <span key="note" className="text-xs text-muted-foreground">
            {code.note ?? "—"}
          </span>,
          <span key="minted" className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDay(code.createdAt)}
          </span>,
        ])}
      />
    </>
  );
}
