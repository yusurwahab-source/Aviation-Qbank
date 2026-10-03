import Link from "next/link";

import { Badge, Card } from "@/components/ui";
import {
  sectionDescription,
  sectionTitle,
  type SectionKey,
  type SiteSettings,
} from "@/lib/settings";

import { SectionHeading } from "./section-heading";

export type SectionCounts = { aircraftCount: number; questionCount: number };

/**
 * The three sections the product is built around, each a card of its own —
 * replacing both the old aircraft-only systems strip and the "Built around
 * the 737-800" card that used to sit further down this page. Every aircraft
 * and every class rating joins one of these; there is no standalone
 * "aircraft" section any more, and no "single engine" / "multi engine"
 * split inside class rating either — see the note on the three sections in
 * `CLAUDE.md`.
 *
 * Flying Knowledge's card carries a real count once its bank has published
 * questions (`SectionCounts`, summed the same way as the other two trees in
 * `loadLandingData`) and falls back to "Coming soon" only for a subject-less
 * or all-draft bank — never a made-up number. It is the one section decided
 * to be free in full — see the note on Flying Knowledge in `CLAUDE.md` —
 * because it is the material every pilot keeps reviewing rather than a
 * one-off exam to pass, and metering it would work against the reason it
 * exists.
 */
export function SectionsOverview({
  typeRating,
  classRating,
  flyingKnowledge,
  hiddenSections = [],
  settings,
}: {
  typeRating: SectionCounts;
  classRating: SectionCounts;
  flyingKnowledge: SectionCounts;
  hiddenSections?: SectionKey[];
  settings: Pick<SiteSettings, "sectionLabels">;
}) {
  const shown = (key: SectionKey) => !hiddenSections.includes(key);
  const visibleCount = (
    ["type-rating", "class-rating", "flying-knowledge"] as const
  ).filter(shown).length;

  if (visibleCount === 0) return null;

  return (
    <section id="whats-inside" className="scroll-mt-20">
      <SectionHeading
        eyebrow="What's inside"
        title={
          visibleCount === 3
            ? "Three sections, one question bank each"
            : "What you can study"
        }
        subtitle="Every aircraft and every topic lives inside one of these — pick the one you're studying for."
      />

      <ul
        className={`mt-8 grid gap-4 ${visibleCount === 1 ? "" : visibleCount === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
      >
        {shown("type-rating") ? (
          <li className="h-full">
            <SectionCard
              href="/type-rating"
              title={sectionTitle(settings, "type-rating")}
              description={sectionDescription(settings, "type-rating")}
              stat={`${typeRating.questionCount} questions across ${typeRating.aircraftCount} aircraft`}
              cta="Choose an aircraft"
            />
          </li>
        ) : null}
        {shown("class-rating") ? (
          <li className="h-full">
            <SectionCard
              href="/class-rating"
              title={sectionTitle(settings, "class-rating")}
              description={sectionDescription(settings, "class-rating")}
              stat={`${classRating.questionCount} questions across ${classRating.aircraftCount} aircraft`}
              cta="Choose an aircraft"
            />
          </li>
        ) : null}
        {shown("flying-knowledge") ? (
          <li className="h-full">
            <SectionCard
              href="/flying-knowledge"
              title={sectionTitle(settings, "flying-knowledge")}
              description={sectionDescription(settings, "flying-knowledge")}
              stat={
                flyingKnowledge.questionCount > 0
                  ? `${flyingKnowledge.questionCount} questions across ${flyingKnowledge.aircraftCount} subject${flyingKnowledge.aircraftCount === 1 ? "" : "s"}`
                  : null
              }
              cta={
                flyingKnowledge.questionCount > 0
                  ? "Choose a subject"
                  : "See what's planned"
              }
            />
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function SectionCard({
  href,
  title,
  description,
  stat,
  cta,
}: {
  href: string;
  title: string;
  description: string;
  /** `null` for a section with no bank yet — shown as "Coming soon" instead
   * of a made-up count. */
  stat: string | null;
  cta: string;
}) {
  return (
    <Link href={href} className="block h-full">
      <Card className="flex h-full flex-col transition hover:border-brand hover:shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {stat ? (
            <Badge tone="brand">{stat}</Badge>
          ) : (
            <Badge>Coming soon</Badge>
          )}
        </div>

        <p className="mt-3 text-sm text-muted-foreground">{description}</p>

        <p className="mt-auto pt-4 text-sm font-semibold text-brand-ink">{cta} →</p>
      </Card>
    </Link>
  );
}
