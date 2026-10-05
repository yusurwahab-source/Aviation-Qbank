import type { Metadata } from "next";
import Link from "next/link";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Badge, Card, PageHeading } from "@/components/ui";
import { getLogbookAccess, listLogbooks } from "@/db/logbooks";
import { getCurrentUser } from "@/lib/auth/session";
import { logbookPurchasesEnabled, logbookScannerConfigured } from "@/lib/logbook/config";
import {
  FREE_SPREADS_PER_ACCOUNT,
  LOGBOOK_UNLOCK_PRICE_EUR_CENTS,
  SPREADS_PER_UNLOCK,
  formatEuro,
} from "@/lib/logbook/entitlement";

import { startLogbook } from "./actions";
import { DeleteAllLogbookData } from "./delete-all-button";
import { LogbookPrivacyNotice } from "./privacy-notice";

export const metadata: Metadata = {
  title: "Logbook Scanner",
  description:
    "Photograph your paper EASA pilot logbook and get a checked e-logbook: every page total, carry-forward and flight verified, with a guide to correcting the paper.",
};
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

const STEPS = [
  ["Photograph", "One photo per two-page spread, straight from your phone."],
  ["Check", "Every page sum, carry-forward and flight is verified in code — no guessing."],
  ["Fix", "Accept the suggested corrections, or mark a finding as correct."],
  ["Export", "CSV, Excel, JSON or a PDF laid out like your logbook, plus a page-by-page guide to fix the paper."],
] as const;

export default async function LogbookScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ redeemed?: string }>;
}) {
  const { redeemed } = await searchParams;
  const configured = logbookScannerConfigured();
  const user = await getCurrentUser();

  let data: Awaited<ReturnType<typeof load>> | null = null;
  if (user) {
    try {
      data = await load(user.id);
    } catch {
      return <DatabaseUnavailable />;
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Tools"
        title="Logbook Scanner"
        subtitle="Turn photos of your paper EASA logbook into a verified e-logbook — and find every sum that doesn't add up."
      />

      {redeemed ? (
        <Card className="mb-6 border-correct">
          <p className="text-sm text-foreground">Code redeemed — you have a logbook unlock ready to use.</p>
        </Card>
      ) : null}

      <ol className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(([title, body], index) => (
          <li key={title}>
            <Card className="h-full" padding="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-ink">Step {index + 1}</p>
              <p className="mt-1 font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </Card>
          </li>
        ))}
      </ol>

      {!configured ? (
        <Card className="mb-6">
          <p className="text-sm text-muted-foreground">
            The Logbook Scanner is not switched on for this site yet. Check back soon.
          </p>
        </Card>
      ) : null}

      {!user ? (
        <Card className="mb-6">
          <h2 className="font-semibold text-foreground">Sign in to start</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your first {FREE_SPREADS_PER_ACCOUNT} spreads are free, with the full error report. A logbook of up to{" "}
            {SPREADS_PER_UNLOCK} spreads is a one-time unlock — and included once with a PilotQBank subscription.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/signup"
              className="tap-target inline-flex items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid hover:bg-brand-strong"
            >
              Create a free account
            </Link>
            <Link
              href="/login"
              className="tap-target inline-flex items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:border-brand"
            >
              Log in
            </Link>
          </div>
        </Card>
      ) : null}

      {user && data ? (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            {configured ? (
              <Card>
                <h2 className="font-semibold text-foreground">Start a new logbook</h2>
                <form action={startLogbook} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <label htmlFor="logbook-name" className="sr-only">
                    Logbook name
                  </label>
                  <input
                    id="logbook-name"
                    name="name"
                    maxLength={120}
                    defaultValue="My logbook"
                    className="tap-target w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="tap-target shrink-0 rounded-lg bg-brand px-5 text-sm font-semibold text-on-solid hover:bg-brand-strong"
                  >
                    Start scanning
                  </button>
                </form>
              </Card>
            ) : null}

            <Card>
              <h2 className="font-semibold text-foreground">Your logbooks</h2>
              {data.logbooks.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Nothing saved yet. Logbooks you save, or unlock, are listed here.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {data.logbooks.map((logbook) => (
                    <li key={logbook.id}>
                      <Link
                        href={`/tools/logbook/${logbook.id}`}
                        className="flex min-h-11 items-center justify-between gap-3 py-2 hover:text-brand-ink"
                      >
                        <span className="min-w-0 truncate font-medium text-foreground">{logbook.name}</span>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                          {logbook.unlockedAt ? <Badge tone="brand">Unlocked</Badge> : null}
                          {logbook.savedAt ? `Saved ${dateFormat.format(logbook.savedAt)}` : "Not saved"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="font-semibold text-foreground">Delete your data</h2>
              <p className="mt-2 mb-3 text-sm text-muted-foreground">
                Removes every logbook saved to your account.
              </p>
              <DeleteAllLogbookData />
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <h2 className="font-semibold text-foreground">Your allowance</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Free spreads left</dt>
                  <dd className="font-semibold text-foreground">
                    {Math.max(0, FREE_SPREADS_PER_ACCOUNT - data.access.freeSpreadsUsed)} of {FREE_SPREADS_PER_ACCOUNT}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Logbook unlocks</dt>
                  <dd className="font-semibold text-foreground">{data.access.availableUnlocks}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                An unlock covers one logbook of up to {SPREADS_PER_UNLOCK} spreads.
                {data.access.hasActiveSubscription && !data.access.subscriptionCreditUsed
                  ? " Your subscription includes one."
                  : ""}
                {logbookPurchasesEnabled()
                  ? ` One-time price: ${formatEuro(LOGBOOK_UNLOCK_PRICE_EUR_CENTS)}.`
                  : ""}
              </p>
              <Link href="/redeem" className="link-standalone mt-2 text-sm font-medium text-brand-ink hover:underline">
                Redeem a license code →
              </Link>
            </Card>

            <LogbookPrivacyNotice />
          </div>
        </div>
      ) : (
        <LogbookPrivacyNotice />
      )}
    </>
  );
}

async function load(userId: string) {
  const [access, logbooks] = await Promise.all([getLogbookAccess(userId), listLogbooks(userId)]);
  return { access, logbooks };
}
