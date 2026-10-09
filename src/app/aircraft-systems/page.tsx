import Link from "next/link";
import type { Metadata } from "next";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Badge, Card, PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";
import { listClassRatings } from "@/db/class-queries";
import { listAircraft } from "@/db/queries";
import { getSiteSettings } from "@/db/settings";
import { summariseSection, type SectionCounts } from "@/lib/section-counts";
import { isSectionHidden, withoutHidden } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Aircraft Systems Knowledge",
  description: `Type rating and class rating systems questions, aircraft by aircraft. ${siteConfig.name} — learn the aircraft, not just the answers.`,
};

export const dynamic = "force-dynamic";

const EYEBROW = "Aircraft Systems Knowledge";

type Path = {
  href: string;
  title: string;
  description: string;
  counts: SectionCounts;
  codes: string[];
};

/**
 * The front door to the two aircraft question banks. A thin chooser: it
 * reads the two trees for real counts and links straight into the pickers
 * that already exist (`/type-rating`, `/class-rating`). The trees stay
 * separate underneath — only this page presents them together.
 */
export default async function AircraftSystemsPage() {
  let paths: Path[];

  try {
    const settings = await getSiteSettings();
    const [fleet, classes] = await Promise.all([
      listAircraft().then((rows) =>
        withoutHidden(settings, "type-rating", rows),
      ),
      listClassRatings().then((rows) =>
        withoutHidden(settings, "class-rating", rows),
      ),
    ]);
    const codesOf = (
      rows: { code: string; status: string; publishedQuestions: number }[],
    ) =>
      rows
        .filter((row) => row.status === "active" && row.publishedQuestions > 0)
        .map((row) => row.code);

    const candidates: { path: Path; hidden: boolean }[] = [
      {
        hidden: isSectionHidden(settings, "type-rating"),
        path: {
          href: "/type-rating",
          title: "Type Rating",
          description:
            "Large aircraft, system by system — study with explanations, or sit a timed mock exam.",
          counts: summariseSection(fleet),
          codes: codesOf(fleet),
        },
      },
      {
        hidden: isSectionHidden(settings, "class-rating"),
        path: {
          href: "/class-rating",
          title: "Class Rating",
          description:
            "Light aircraft, practised the same way — straight to the aircraft, no engine-count split.",
          counts: summariseSection(classes),
          codes: codesOf(classes),
        },
      },
    ];
    paths = candidates.filter(({ hidden }) => !hidden).map(({ path }) => path);
  } catch (error) {
    return (
      <>
        <PageHeading eyebrow={EYEBROW} title="Type rating or class rating?" />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  return (
    <>
      <PageHeading
        eyebrow={EYEBROW}
        title="Type rating or class rating?"
        subtitle="Large aircraft or light aircraft — pick the kind of rating you're preparing for, then the aircraft."
      />

      <ul className="grid gap-4 sm:grid-cols-2">
        {paths.map((path) => (
          <li key={path.href}>
            <Link href={path.href} className="block h-full">
              <Card className="flex h-full flex-col transition hover:border-brand hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground">
                    {path.title}
                  </h2>
                  <Badge tone="brand">
                    {path.counts.questionCount} questions
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {path.description}
                </p>
                {path.codes.length > 0 ? (
                  <p className="mt-3 font-mono text-xs text-muted-foreground">
                    {path.codes.join(" · ")}
                  </p>
                ) : null}
                <p className="mt-auto pt-4 text-sm font-semibold text-brand-ink">
                  Choose an aircraft →
                </p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
