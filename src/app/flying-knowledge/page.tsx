import { getSiteSettings } from "@/db/settings";
import { sectionTitle, withItemOverrides, withoutHidden } from "@/lib/settings";
import Link from "next/link";
import type { Metadata } from "next";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Badge, Card, EmptyState, PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";
import {
  listFlyingKnowledgeSubjects,
  type FlyingKnowledgeSubjectSummary,
} from "@/db/flying-knowledge-queries";

export const metadata: Metadata = {
  title: "Choose a subject — Flying Knowledge",
  description: `Pick a subject and start a practice quiz. ${siteConfig.name} keeps a separate question bank per subject — free in full, for everyone.`,
};

export const dynamic = "force-dynamic";

/**
 * Flying Knowledge's own picker, alongside `type-rating/page.tsx` and
 * `class-rating/page.tsx` — the third of the three sections, reading the
 * third content tree described in the note on `flyingKnowledgeSubjects` in
 * `db/schema.ts`. Every subject (IFR, POF today) sits directly here, the same
 * flat shape a class rating uses: no sub-category between it and the
 * section.
 *
 * Unlike the other two pickers, there is no "Upgrade" banner here — Flying
 * Knowledge is free in full, by product decision, so nothing on this page
 * ever mentions a free-tier allowance or a subscription. See the note on
 * the three sections in `CLAUDE.md`.
 */
export default async function FlyingKnowledgePickerPage() {
  let subjects: FlyingKnowledgeSubjectSummary[];

  try {
    subjects = withItemOverrides(await getSiteSettings(), "flying-knowledge", withoutHidden(await getSiteSettings(), "flying-knowledge", await listFlyingKnowledgeSubjects()));
  } catch (error) {
    return (
      <>
        <PageHeading eyebrow={sectionTitle(await getSiteSettings(), "flying-knowledge")} title="Choose a subject" />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  return (
    <>
      <PageHeading
        eyebrow={sectionTitle(await getSiteSettings(), "flying-knowledge")}
        title="Choose a subject"
        subtitle="Air law, meteorology, navigation and the rest of ground school — practised on its own, separate from any type or class rating, and free in full for everyone."
      />

      {subjects.length === 0 ? (
        <EmptyState title="No subjects loaded yet">
          Add a folder under <code className="font-mono">content/flying-knowledge/</code> and run{" "}
          <code className="font-mono">npm run db:seed</code>.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {subjects.map((subject) => (
            <li key={subject.code}>
              <SubjectCard subject={subject} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/class-rating"
          className="link-standalone text-sm font-medium text-brand-ink hover:underline"
        >
          ← Class ratings
        </Link>
        <Link
          href="/type-rating"
          className="link-standalone text-sm font-medium text-brand-ink hover:underline"
        >
          Or type ratings →
        </Link>
      </p>
    </>
  );
}

function SubjectCard({ subject }: { subject: FlyingKnowledgeSubjectSummary }) {
  const ready = subject.status === "active" && subject.publishedQuestions > 0;

  const body = (
    <Card
      className={`h-full transition ${ready ? "hover:border-brand hover:shadow-sm" : "opacity-70"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand-ink">
            {subject.code}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{subject.name}</h2>
        </div>
        {!ready ? (
          <Badge>Coming soon</Badge>
        ) : (
          <Badge tone="brand">{subject.publishedQuestions} questions</Badge>
        )}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{subject.description}</p>
    </Card>
  );

  if (!ready) return body;

  return (
    <Link href={`/flying-knowledge/${subject.code}`} className="block h-full">
      {body}
    </Link>
  );
}
