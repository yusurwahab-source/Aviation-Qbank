import type { Metadata } from "next";
import Link from "next/link";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { findResetToken } from "@/db/password-reset";

import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Set a new password" };
export const dynamic = "force-dynamic";

/**
 * The page a reset link opens.
 *
 * It looks the link up but does **not** spend it. Spending on arrival would
 * mean that opening the email, glancing at the form and then reloading it —
 * or having a mail client prefetch the link, which some do — burns the one
 * chance to use it. The link is spent by submitting the form, and nowhere
 * else.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const query = await searchParams;
  const raw = Array.isArray(query.token) ? query.token[0] : query.token;
  const token = raw?.trim() ?? "";

  if (!token) return <LinkProblem reason="That link is missing its token." />;

  let lookup;
  try {
    lookup = await findResetToken(token);
  } catch (error) {
    return <DatabaseUnavailable detail={(error as Error).message} />;
  }

  if (lookup.state !== "valid") {
    return (
      <LinkProblem
        reason={
          lookup.state === "used"
            ? "That link has already been used."
            : lookup.state === "expired"
              ? "That link has expired — they last an hour."
              : "That link is not valid. It may have been replaced by a newer one."
        }
      />
    );
  }

  return <ResetForm token={token} email={lookup.email} />;
}

/**
 * One screen for every way a link can fail, differing only in the sentence.
 *
 * Each names its own cause rather than giving one vague message. That is not
 * a leak: holding a reset link is already knowing more than these words add,
 * and a person who cannot tell "already used" from "expired" cannot tell what
 * to do next either.
 */
function LinkProblem({ reason }: { reason: string }) {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        This link will not work
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{reason}</p>
      <p className="mt-3 text-sm text-muted-foreground">
        Nothing has changed on your account. Ask for a new link and use it within the hour.
      </p>
      <p className="mt-6 text-center text-sm">
        <Link href="/forgot-password" className="font-medium text-brand-ink hover:underline">
          Send a new link
        </Link>
      </p>
    </div>
  );
}
