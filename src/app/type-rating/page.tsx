import { sectionTitle, withItemOverrides, withoutHidden } from "@/lib/settings";
import Link from "next/link";
import type { Metadata } from "next";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Badge, Card, EmptyState, PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";
import { FREE_MODE } from "@/config/free-mode";
import { getSubscription } from "@/db/subscriptions";
import { listAircraft, type AircraftSummary } from "@/db/queries";
import { hasActiveSubscription } from "@/lib/billing/access-policy";
import {  } from "@/db/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { getVisibleSiteSettings } from "@/lib/settings-visibility";
import { HeroButton } from "@/components/ui/hero-button";

export const metadata: Metadata = {
  title: "Jets & Turboprops",
  description: `Pick an aircraft and start a practice test. ${siteConfig.name} keeps a separate question bank per aircraft.`,
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
  if (FREE_MODE) return false;
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    const subscription = await getSubscription(user.id);
    return !(subscription !== null && hasActiveSubscription(subscription));
  } catch {
    return false;
  }
}

export default async function TypeRatingPickerPage() {
  let fleet: AircraftSummary[];

  try {
    fleet = withItemOverrides(await getVisibleSiteSettings(), "type-rating", withoutHidden(await getVisibleSiteSettings(), "type-rating", await listAircraft()));
  } catch (error) {
    return (
      <>
        <PageHeading eyebrow="Aircraft" title={sectionTitle(await getVisibleSiteSettings(), "type-rating")} />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  const [offerUpgrade, settings] = await Promise.all([shouldOfferUpgrade(), getVisibleSiteSettings()]);

  return (
    <>
      <PageHeading
        eyebrow="Aircraft"
        title={sectionTitle(settings, "type-rating")}
        subtitle="Choose an aircraft for its study materials and systems question bank."
      />

      {offerUpgrade ? (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Practising is free up to {settings.freeQuestionsPerAircraft} questions on each aircraft.
            Subscribe for unlimited questions on every type.
          </p>
          <HeroButton asChild size="sm" className="shrink-0"><Link href="/upgrade">
            Upgrade
          </Link></HeroButton>
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

      <p className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/aircraft-systems"
          className="link-standalone text-sm font-medium text-brand-ink hover:underline"
        >
          ← All aircraft
        </Link>
        <Link
          href="/class-rating"
          className="link-standalone text-sm font-medium text-brand-ink hover:underline"
        >
          Light Aircraft →
        </Link>
      </p>
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
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand-ink">
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
    <Link href={`/type-rating/${plane.code}`} className="block h-full">
      {body}
    </Link>
  );
}
