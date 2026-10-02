import { sectionTitle, withItemOverrides, withoutHidden } from "@/lib/settings";
import Link from "next/link";
import type { Metadata } from "next";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Badge, Card, EmptyState, PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";
import { getSubscription } from "@/db/subscriptions";
import { listClassRatings, type ClassRatingSummary } from "@/db/class-queries";
import { hasActiveSubscription } from "@/lib/billing/access-policy";
import { getSiteSettings } from "@/db/settings";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Choose an aircraft — Class Rating Systems Knowledge",
  description: `Pick an aircraft and start a practice test. ${siteConfig.name} keeps a separate question bank per class.`,
};

export const dynamic = "force-dynamic";

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

/**
 * Class ratings, alongside Type Ratings — the same picker as
 * `type-rating/page.tsx`, for the parallel content tree described in the
 * note on `classRatings` in `db/schema.ts`. Every light aircraft (the DA40
 * today) sits directly here, with no sub-category between it and the
 * section — see the note on class ratings in `CLAUDE.md`.
 */
export default async function ClassRatingPickerPage() {
  let classes: ClassRatingSummary[];

  try {
    classes = withItemOverrides(await getSiteSettings(), "class-rating", withoutHidden(await getSiteSettings(), "class-rating", await listClassRatings()));
  } catch (error) {
    return (
      <>
        <PageHeading eyebrow={sectionTitle(await getSiteSettings(), "class-rating")} title="Choose an aircraft" />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  const [offerUpgrade, settings] = await Promise.all([shouldOfferUpgrade(), getSiteSettings()]);

  return (
    <>
      <PageHeading
        eyebrow={sectionTitle(await getSiteSettings(), "class-rating")}
        title="Choose an aircraft"
        subtitle="Pick an aircraft to start a practice test. Each class has its own question bank."
      />

      {offerUpgrade ? (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Practising is free up to {settings.freeQuestionsPerAircraft} questions on each class.
            Subscribe for unlimited questions on every aircraft and class.
          </p>
          <Link
            href="/upgrade"
            className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
          >
            Upgrade
          </Link>
        </Card>
      ) : null}

      {classes.length === 0 ? (
        <EmptyState title="No class ratings loaded yet">
          Add a folder under <code className="font-mono">content/classes/</code> and run{" "}
          <code className="font-mono">npm run db:seed</code>.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {classes.map((ratingClass) => (
            <li key={ratingClass.code}>
              <ClassCard ratingClass={ratingClass} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/type-rating"
          className="link-standalone text-sm font-medium text-brand hover:underline"
        >
          ← Type ratings
        </Link>
        <Link
          href="/flying-knowledge"
          className="link-standalone text-sm font-medium text-brand hover:underline"
        >
          Or Flying Knowledge →
        </Link>
      </p>
    </>
  );
}

function ClassCard({ ratingClass }: { ratingClass: ClassRatingSummary }) {
  const ready = ratingClass.status === "active" && ratingClass.publishedQuestions > 0;

  const body = (
    <Card
      className={`h-full transition ${
        ready ? "hover:border-brand hover:shadow-sm" : "opacity-70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand">
            {ratingClass.code}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{ratingClass.name}</h2>
        </div>
        {!ready ? (
          <Badge>Coming soon</Badge>
        ) : (
          <Badge tone="brand">{ratingClass.publishedQuestions} questions</Badge>
        )}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{ratingClass.description}</p>
    </Card>
  );

  if (!ready) return body;

  return (
    <Link href={`/class-rating/${ratingClass.code}`} className="block h-full">
      {body}
    </Link>
  );
}
