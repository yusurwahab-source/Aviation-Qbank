import Link from "next/link";
import type { Metadata } from "next";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Badge, Card, PageHeading } from "@/components/ui";
import { AircraftSystemsHero } from "./_hero/aircraft-systems-hero";
import { siteConfig } from "@/config/site";
import { listClassRatings } from "@/db/class-queries";
import { listAircraft } from "@/db/queries";
import {
  isSectionHidden,
  sectionTitle,
  withItemOverrides,
  withoutHidden,
  type SectionKey,
} from "@/lib/settings";
import { getVisibleSiteSettings } from "@/lib/settings-visibility";

export const metadata: Metadata = {
  title: "Aircraft",
  description: `Systems study materials and question banks, aircraft by aircraft — light aircraft, jets and turboprops. ${siteConfig.name}.`,
};

export const dynamic = "force-dynamic";

const EYEBROW = "Aircraft";

type AircraftRow = {
  code: string;
  name: string;
  status: string;
  publishedQuestions: number;
};

type Category = {
  section: SectionKey;
  href: string;
  title: string;
  aircraft: AircraftRow[];
};

/**
 * The aircraft directory: exactly two categories, Light Aircraft and Jets &
 * Turboprops, each listing its aircraft so one tap reaches an aircraft.
 * The categories are the two content trees as they already exist — class
 * rating (`/class-rating`) holds the light aircraft, type rating
 * (`/type-rating`) the jets and turboprops — so routes, tables and the
 * question banks underneath are unchanged; only the names a student reads
 * are. Only aircraft with published questions are listed.
 */
export default async function AircraftDirectoryPage() {
  let categories: Category[];

  try {
    const settings = await getVisibleSiteSettings();
    const [light, large] = await Promise.all([
      listClassRatings().then((rows) =>
        withItemOverrides(settings, "class-rating", withoutHidden(settings, "class-rating", rows)),
      ),
      listAircraft().then((rows) =>
        withItemOverrides(settings, "type-rating", withoutHidden(settings, "type-rating", rows)),
      ),
    ]);

    const candidates: Category[] = [
      {
        section: "class-rating",
        href: "/class-rating",
        title: sectionTitle(settings, "class-rating"),
        aircraft: light.filter(isReady),
      },
      {
        section: "type-rating",
        href: "/type-rating",
        title: sectionTitle(settings, "type-rating"),
        aircraft: large.filter(isReady),
      },
    ];
    categories = candidates.filter(({ section }) => !isSectionHidden(settings, section));
  } catch (error) {
    return (
      <>
        <AircraftSystemsHero />
        <PageHeading eyebrow={EYEBROW} title="Choose a category" />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  return (
    <>
      <AircraftSystemsHero />
      <PageHeading eyebrow={EYEBROW} title="Choose a category" />

      <ul className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {categories.map((category) => (
          <li key={category.href}>
            <Card className="flex h-full flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">
                  <Link href={category.href} className="link-standalone hover:text-brand-ink">
                    {category.title}
                  </Link>
                </h2>
                <Badge tone="brand">
                  {category.aircraft.length} aircraft
                </Badge>
              </div>

              {category.aircraft.length === 0 ? (
                <p className="text-sm text-muted-foreground">No aircraft here yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {category.aircraft.map((plane) => (
                    <li key={plane.code}>
                      <Link
                        href={`${category.href}/${plane.code}`}
                        className="tap-target flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm transition hover:border-brand focus-visible:border-brand"
                      >
                        <span className="min-w-0">
                          <span className="font-mono text-xs font-semibold text-brand-ink">
                            {plane.code}
                          </span>
                          <span className="text-foreground"> · {plane.name}</span>
                        </span>
                        <span aria-hidden="true" className="font-semibold text-brand-ink">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

function isReady(row: AircraftRow): boolean {
  return row.status === "active" && row.publishedQuestions > 0;
}
