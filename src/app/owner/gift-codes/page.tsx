import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card, PageHeading } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { isOwner } from "@/lib/auth/owner";
import { envValue } from "@/lib/env";

import { GenerateForm } from "./generate-form";

export const metadata: Metadata = { title: "Generate gift codes" };
export const dynamic = "force-dynamic";

/**
 * Where the owner mints gift codes, without a terminal or a database
 * connection — `npm run gift:generate` still exists for bulk or scripted
 * use, but this is the page for "I need one code, right now."
 *
 * `notFound()` rather than a redirect for anyone else: a 404 says nothing
 * about whether this path exists for someone who isn't the owner, where a
 * redirect to /login would confirm it does.
 */
export default async function OwnerGiftCodesPage() {
  const user = await getCurrentUser();
  if (!user || !isOwner(user.email, envValue("OWNER_EMAIL"))) notFound();

  return (
    <>
      <PageHeading
        title="Generate gift codes"
        subtitle="Each code grants full access once redeemed, for as many days as you choose."
      />
      <Card>
        <GenerateForm />
      </Card>
    </>
  );
}
