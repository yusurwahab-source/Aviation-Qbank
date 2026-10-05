import type { Metadata } from "next";
import Link from "next/link";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { findUnsubscribeToken } from "@/db/unsubscribe";

import { UnsubscribeForm } from "./unsubscribe-form";

export const metadata: Metadata = { title: "Unsubscribe" };
export const dynamic = "force-dynamic";

/**
 * Where the link at the bottom of a message leads. Looks the token up and
 * shows who it is for; the button does the unsubscribing, for the reason
 * reset links work this way.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const query = await searchParams;
  const raw = Array.isArray(query.token) ? query.token[0] : query.token;
  const token = raw?.trim() ?? "";

  let found;
  try {
    found = token ? await findUnsubscribeToken(token) : null;
  } catch (error) {
    return <DatabaseUnavailable detail={(error as Error).message} />;
  }

  if (!found) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">This link will not work</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          It may be incomplete. If you are signed in, you can change what you receive from your
          account.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link href="/account" className="font-medium text-brand-ink hover:underline">
            Go to your account
          </Link>
        </p>
      </div>
    );
  }

  return <UnsubscribeForm token={token} email={found.email} alreadyOptedOut={found.alreadyOptedOut} />;
}
