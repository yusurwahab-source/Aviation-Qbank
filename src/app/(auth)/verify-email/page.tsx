import type { Metadata } from "next";
import Link from "next/link";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { findVerificationToken } from "@/db/email-verification";

import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Confirm your email" };
export const dynamic = "force-dynamic";

/**
 * The page a verification link opens.
 *
 * Looks the link up but does not spend it — the button does, for the reason
 * reset links work the same way. Works signed in or out: the link itself is
 * the proof.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const query = await searchParams;
  const raw = Array.isArray(query.token) ? query.token[0] : query.token;
  const token = raw?.trim() ?? "";

  if (!token) return <Problem reason="That link is missing its token." />;

  let lookup;
  try {
    lookup = await findVerificationToken(token);
  } catch (error) {
    return <DatabaseUnavailable detail={(error as Error).message} />;
  }

  if (lookup.state !== "valid") {
    return (
      <Problem
        reason={
          lookup.state === "used"
            ? "That link has already been used."
            : lookup.state === "expired"
              ? "That link has expired — they last a day."
              : "That link is not valid. It may have been replaced by a newer one."
        }
      />
    );
  }

  return <VerifyForm token={token} email={lookup.email} />;
}

function Problem({ reason }: { reason: string }) {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        This link will not work
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{reason}</p>
      <p className="mt-6 text-center text-sm">
        <Link href="/account" className="font-medium text-brand-ink hover:underline">
          Send a new link from your account
        </Link>
      </p>
    </div>
  );
}
