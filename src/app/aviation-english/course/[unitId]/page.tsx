import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, Card, PageHeading } from "@/components/ui";
import { lessonsForUnit } from "@/content/aviation-english/lessons";
import { getUnit } from "@/content/aviation-english/units";

import { LessonDoneBadge } from "../../_components/lesson-done-badge";

export default async function UnitPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  const unit = getUnit(unitId);
  if (!unit) notFound();
  const lessons = lessonsForUnit(unit.id);

  return (
    <>
      <PageHeading eyebrow={`Unit ${unit.order}`} title={unit.title} subtitle={unit.summary} />
      <ul className="space-y-3">
        {lessons.map((l, i) => (
          <li key={l.id}>
            <Link href={`/aviation-english/lesson/${l.id}`} className="block">
              <Card className="transition hover:border-brand">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-foreground">
                    {i + 1}. {l.title}
                  </h2>
                  <div className="flex gap-2">
                    <LessonDoneBadge lessonId={l.id} />
                    <Badge>{l.durationMinutes} min</Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{l.objective}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/aviation-english/course" className="link-standalone mt-6 inline-block text-sm text-brand-ink underline">
        Back to all units
      </Link>
    </>
  );
}
