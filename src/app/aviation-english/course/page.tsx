import Link from "next/link";

import { Card, PageHeading } from "@/components/ui";
import { UNITS } from "@/content/aviation-english/units";

export const metadata = { title: "Course" };

export default function CoursePage() {
  return (
    <>
      <PageHeading eyebrow="Aviation English" title="Course" subtitle="Four units, eleven lessons." />
      <ul className="grid gap-4 sm:grid-cols-2">
        {UNITS.map((u) => (
          <li key={u.id}>
            <Link href={`/aviation-english/course/${u.id}`} className="block h-full">
              <Card className="h-full transition hover:border-brand">
                <p className="text-xs font-semibold uppercase text-brand-ink">Unit {u.order}</p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">{u.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{u.summary}</p>
                <p className="mt-3 text-xs text-muted-foreground">{u.lessonIds.length} lessons</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
