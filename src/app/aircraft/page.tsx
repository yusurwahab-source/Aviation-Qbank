import Link from "next/link";
import type { Metadata } from "next";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Badge, Card, EmptyState, PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";
import { getSubscription } from "@/db/subscriptions";
import { listAircraft, type AircraftSummary } from "@/db/queries";
import { hasActiveSubscription } from "@/lib/billing/access-policy";
import { getSiteSettings } from "@/db/settings";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Choose an aircraft",
  description: `Pick a type and start a practice test. ${siteConfig.name} keeps a separate question bank per aircraft.`,
};

// The aircraft list comes from the database, so this page is rendered per request.
export const dynamic = "force-dynamic";

/**
 * Whether to show the upgrade banner: only a signed-in student without an
 * active subscription already has a reason to see it. Failure here is never
 * fatal to the page — same reasoning as `AccountMenu` catching its own
 * lookup — it just means the banner is skipped for this render.
 */
async function shouldOfferUpgrade(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    const subscription = await getSubscription(user.id);
    return !(subscription !== null && hasActiveSubscription(subscription));
  } catch {
    return false;
  }
}

export default async function AircraftPickerPage() {
  let fleet: AircraftSummary[];

  try {
    fleet = await listAircraft();
  } catch (error) {
    return (
      <>
        <PageHeading title="Choose an aircraft" />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  const [offerUpgrade, settings] = await Promise.all([shouldOfferUpgrade(), getSiteSettings()]);

  return (
    <>
      <PageHeading
        title="Choose an aircraft"
        subtitle="Pick a type to start a practice test. Each aircraft has its own question bank."
      />

      {offerUpgrade ? (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Practising is free up to {settings.freeQuestionsPerAircraft} questions on each aircraft.
            Subscribe for unlimited questions on every type.
          </p>
          <Link
            href="/upgrade"
            className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
          >
            Upgrade
          </Link>
        </Card>
      ) : null}

      {fleet.length === 0 ? (
        <EmptyState title="No aircraft loaded yet">
          Add a folder under <code className="font-mono">/content</code> and run{" "}
          <code className="font-mono">npm run db:seed</code>.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {fleet.map((plane) => (
            <li key={plane.code}>
              <AircraftCard
                plane={plane}
                inDevelopment={settings.aircraftInDevelopment.includes(plane.code)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function AircraftCard({
  plane,
  inDevelopment,
}: {
  plane: AircraftSummary;
  inDevelopment: boolean;
}) {
  const ready = plane.status === "active" && plane.publishedQuestions > 0;

  const body = (
    <Card
      className={`h-full transition ${
        ready ? "hover:border-brand hover:shadow-sm" : "opacity-70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand">
            {plane.code}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{plane.name}</h2>
          <p className="text-sm text-muted-foreground">
            {plane.manufacturer}
            {plane.variant ? ` · ${plane.variant}` : ""}
          </p>
        </div>
        {!ready ? (
          <Badge>Coming soon</Badge>
        ) : inDevelopment ? (
          <Badge tone="warning">In development</Badge>
        ) : (
          <Badge tone="brand">{plane.publishedQuestions} questions</Badge>
        )}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{plane.description}</p>

      {ready && inDevelopment ? (
        <p className="mt-3 text-xs text-subtle-foreground">
          The bank is still small — {plane.publishedQuestions} questions so far, growing over
          time. You can practise what is here today.
        </p>
      ) : null}
    </Card>
  );

  if (!ready) return body;

  return (
    <Link href={`/aircraft/${plane.code}`} className="block h-full">
      {body}
    </Link>
  );
}
