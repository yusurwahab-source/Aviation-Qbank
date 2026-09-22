import Link from "next/link";

import { Badge, Card } from "@/components/ui";

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
 * Aviation knowledge has no bank yet, so its card carries no count and its
 * button leads to a page that says so plainly rather than promising a test
 * this section cannot yet deliver.
 */
export function SectionsOverview({
  typeRating,
  classRating,
}: {
  typeRating: SectionCounts;
  classRating: SectionCounts;
}) {
  return (
    <section id="whats-inside" className="scroll-mt-20">
      <SectionHeading
        eyebrow="What's inside"
        title="Three sections, one question bank each"
        subtitle="Every aircraft and every topic lives inside one of these — pick the one you're studying for."
      />

      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        <li className="h-full">
          <SectionCard
            href="/type-rating"
            title="Type rating"
            description="Large aircraft, system by system. Study with explanations in front of you, or sit a timed mock exam."
            stat={`${typeRating.questionCount} questions across ${typeRating.aircraftCount} aircraft`}
            cta="Practise a type rating"
          />
        </li>
        <li className="h-full">
          <SectionCard
            href="/class-rating"
            title="Class rating"
            description="Light aircraft, practised the same way — no single-engine or multi-engine split, just the aircraft itself."
            stat={`${classRating.questionCount} questions across ${classRating.aircraftCount} aircraft`}
            cta="Practise a class rating"
          />
        </li>
        <li className="h-full">
          <SectionCard
            href="/aviation-knowledge"
            title="Aviation knowledge"
            description="General theory that isn't tied to one aircraft — air law, meteorology, navigation and the rest of ground school."
            stat={null}
            cta="See what's planned"
          />
        </li>
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
          {stat ? <Badge tone="brand">{stat}</Badge> : <Badge>Coming soon</Badge>}
        </div>

        <p className="mt-3 text-sm text-muted-foreground">{description}</p>

        <p className="mt-auto pt-4 text-sm font-semibold text-brand">{cta} →</p>
      </Card>
    </Link>
  );
}
