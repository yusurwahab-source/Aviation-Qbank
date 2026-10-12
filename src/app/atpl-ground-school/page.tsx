import Link from "next/link";
import type { Metadata } from "next";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { LiveBadge } from "@/components/live-badge";
import { Badge, Card, PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";
import {
  listFlyingKnowledgeSubjects,
  type FlyingKnowledgeSubjectSummary,
} from "@/db/flying-knowledge-queries";
import {  } from "@/db/settings";
import { isOwner } from "@/lib/auth/owner";
import { getCurrentUser } from "@/lib/auth/session";
import { buildAtplRows, type AtplRow } from "@/lib/atpl-subjects";
import { envValue } from "@/lib/env";
import { isItemHidden, withoutHidden } from "@/lib/settings";
import { getVisibleSiteSettings } from "@/lib/settings-visibility";

export const metadata: Metadata = {
  title: "EASA ATPL Ground School",
  description: `The thirteen EASA ATPL theory subjects, one question bank each. ${siteConfig.name} — free in full, for everyone.`,
};

export const dynamic = "force-dynamic";

const EYEBROW = "EASA ATPL Ground School";

/**
 * The thirteen ATPL theory subjects as one vertical list. Subjects with a
 * bank are live and linked to `/flying-knowledge/<code>`, where their tests
 * still run; the rest are inert "coming soon" rows. Free in full, like the
 * Flying Knowledge tree behind it — nothing here mentions an allowance.
 * The owner still sees a subject hidden from students, marked as such.
 */
export default async function AtplGroundSchoolPage() {
  let rows: AtplRow[];
  const hiddenCodes = new Set<string>();
  let owner = false;

  try {
    try {
      const email = (await getCurrentUser())?.email;
      owner = email ? isOwner(email, envValue("OWNER_EMAIL")) : false;
    } catch {
      owner = false;
    }
    const settings = await getVisibleSiteSettings();
    const subjects: FlyingKnowledgeSubjectSummary[] = await listFlyingKnowledgeSubjects();
    for (const subject of subjects) {
      if (isItemHidden(settings, "flying-knowledge", subject.code)) hiddenCodes.add(subject.code);
    }
    rows = buildAtplRows(owner ? subjects : withoutHidden(settings, "flying-knowledge", subjects));
  } catch (error) {
    return (
      <>
        <PageHeading eyebrow={EYEBROW} title="Choose a subject" />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  const liveCount = rows.filter((row) => row.live).length;

  return (
    <>
      <PageHeading
        eyebrow={EYEBROW}
        title="Choose a subject"
        subtitle={`${liveCount} of ${rows.length} subjects are live. Learn why each answer is right, not just which one — free in full, for everyone.`}
      />

      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.number}>
            <SubjectRow row={row} hiddenFromStudents={row.live ? hiddenCodes.has(row.live.code) : false} />
          </li>
        ))}
      </ul>

      <p className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/type-rating"
          className="link-standalone text-sm font-medium text-brand-ink hover:underline"
        >
          Type ratings →
        </Link>
        <Link
          href="/class-rating"
          className="link-standalone text-sm font-medium text-brand-ink hover:underline"
        >
          Class ratings →
        </Link>
      </p>
    </>
  );
}

function SubjectRow({ row, hiddenFromStudents }: { row: AtplRow; hiddenFromStudents: boolean }) {
  const body = (
    <Card
      className={`flex min-h-16 flex-col gap-2 transition ${
        row.live ? "border-correct hover:shadow-sm" : "opacity-70"
      }`}
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand-ink">
        {row.number}
      </p>
      <h2 className="text-base font-semibold text-foreground">{row.name}</h2>
      <div className="flex flex-wrap items-center gap-2">
        {row.live ? (
          <>
            <LiveBadge />
            <Badge tone="brand">{row.live.publishedQuestions} questions</Badge>
          </>
        ) : (
          <Badge>Coming soon</Badge>
        )}
        {hiddenFromStudents ? <Badge>Hidden from students</Badge> : null}
      </div>
    </Card>
  );

  if (!row.live) return body;

  return (
    <Link href={`/flying-knowledge/${row.live.code}`} className="block">
      {body}
    </Link>
  );
}
