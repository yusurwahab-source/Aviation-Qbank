import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { PageHeading } from "@/components/ui";
import { getLogbook, getLogbookAccess, getSpreadsRemaining } from "@/db/logbooks";
import { getCurrentUser } from "@/lib/auth/session";
import { FREE_MODE } from "@/config/free-mode";
import { logbookPurchasesEnabled, logbookScannerConfigured } from "@/lib/logbook/config";
import { LOGBOOK_UNLOCK_PRICE_EUR_CENTS, formatEuro } from "@/lib/logbook/entitlement";
import { parseSavedLogbook } from "@/lib/logbook/saved";

import { LogbookScanner } from "./scanner";

export const metadata: Metadata = { title: "Logbook Scanner", robots: { index: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One logbook being scanned — signed in only, and only its owner's. */
export default async function LogbookPage({ params }: { params: Promise<{ logbookId: string }> }) {
  const { logbookId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!UUID.test(logbookId)) notFound();

  let loaded;
  try {
    const logbook = await getLogbook(user.id, logbookId);
    loaded = logbook
      ? {
          logbook,
          access: await getLogbookAccess(user.id),
          remaining: await getSpreadsRemaining(user.id, logbookId),
        }
      : null;
  } catch {
    return <DatabaseUnavailable />;
  }
  if (!loaded) notFound();

  const saved = parseSavedLogbook(loaded.logbook.data);

  return (
    <>
      <p className="mb-2">
        <Link href="/tools/logbook" className="link-standalone text-sm font-medium text-brand-ink hover:underline">
          ← Logbook Scanner
        </Link>
      </p>
      <PageHeading eyebrow="Logbook Scanner" title={loaded.logbook.name} />
      <LogbookScanner
        logbookId={logbookId}
        initialName={loaded.logbook.name}
        initialSpreads={saved?.spreads ?? []}
        initialSavedAt={loaded.logbook.savedAt?.toISOString() ?? null}
        unlocked={FREE_MODE || loaded.logbook.unlockedAt !== null}
        spreadsRemaining={loaded.remaining}
        availableUnlocks={loaded.access.availableUnlocks}
        configured={logbookScannerConfigured()}
        priceLabel={logbookPurchasesEnabled() ? formatEuro(LOGBOOK_UNLOCK_PRICE_EUR_CENTS) : null}
      />
    </>
  );
}
