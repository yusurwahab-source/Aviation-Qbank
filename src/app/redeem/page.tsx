import type { Metadata } from "next";
import Link from "next/link";

import { Card, PageHeading } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";

import { RedeemForm } from "./redeem-form";

export const metadata: Metadata = { title: "Redeem a gift code" };
export const dynamic = "force-dynamic";

/**
 * Where a free-access code becomes an active subscription.
 *
 * Signed in only, the same reasoning as `/upgrade`: access belongs to an
 * account, and a code redeemed while signed out would have nowhere to
 * attach. `redeem` in `actions.ts` does the actual writing; this page only
 * decides what to show.
 */
export default async function RedeemPage() {
  const user = await getCurrentUser();

  return (
    <>
      <PageHeading
        title="Redeem a gift code"
        subtitle="Enter the code you were given for full access to every aircraft."
      />

      {!user ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-brand-ink hover:underline">
              Log in
            </Link>{" "}
            first, then come back to this page to redeem your code.
          </p>
        </Card>
      ) : (
        <Card>
          <RedeemForm />
        </Card>
      )}
    </>
  );
}
