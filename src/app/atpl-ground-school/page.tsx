import Link from "next/link";
import type { Metadata } from "next";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { PageHeading } from "@/components/ui";
import { ExpandableGallery } from "@/components/ui/gallery-animation";
import { siteConfig } from "@/config/site";
import {
  listFlyingKnowledgeChapters,
  listFlyingKnowledgeSubjects,
  type FlyingKnowledgeChapterSummary,
  type FlyingKnowledgeSubjectSummary,
} from "@/db/flying-knowledge-queries";
import {  } from "@/db/settings";
import { isOwner } from "@/lib/auth/owner";
import { getCurrentUser } from "@/lib/auth/session";
import { atplQuestionCount, buildAtplRows, type AtplRow } from "@/lib/atpl-subjects";
import { envValue } from "@/lib/env";
import { isItemHidden, withoutHidden } from "@/lib/settings";
import { getVisibleSiteSettings } from "@/lib/settings-visibility";
import { studyGuideHref } from "@/lib/study-guide";

import { SubjectDetail, SubjectPanel } from "./subject-panels";

export const metadata: Metadata = {
  title: "EASA ATPL Ground School",
  description: `The thirteen EASA ATPL theory subjects, one question bank each. ${siteConfig.name} — free in full, for everyone.`,
};

export const dynamic = "force-dynamic";

const EYEBROW = "EASA ATPL Ground School";

/**
 * The thirteen ATPL theory subjects as an expandable gallery: a shelf of
 * covers that widen on hover, each opening to its chapters and question
 * counts, its study guide and its `/flying-knowledge/<code>` question bank,
 * where tests still run. A subject without a bank opens to "coming soon". Free in full, like the
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
    const [subjects, chapters]: [FlyingKnowledgeSubjectSummary[], FlyingKnowledgeChapterSummary[]] =
      await Promise.all([listFlyingKnowledgeSubjects(), listFlyingKnowledgeChapters()]);
    for (const subject of subjects) {
      if (isItemHidden(settings, "flying-knowledge", subject.code)) hiddenCodes.add(subject.code);
    }
    rows = buildAtplRows(
      owner ? subjects : withoutHidden(settings, "flying-knowledge", subjects),
      chapters,
    );
  } catch (error) {
    return (
      <>
        <PageHeading eyebrow={EYEBROW} title="Choose a subject" />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  const questionCount = atplQuestionCount(rows);

  return (
    <>
      <PageHeading
        eyebrow={EYEBROW}
        title="Choose a subject"
        subtitle={`${rows.length} subjects, ${questionCount.toLocaleString("en-GB")} questions. Open a subject to see its chapters. Learn why each answer is right, not just which one — free in full, for everyone.`}
      />

      <ExpandableGallery
        perRow={7}
        items={rows.map((row) => {
          const hidden = row.live ? hiddenCodes.has(row.live.code) : false;
          return {
            id: row.number,
            label: `${row.number} ${row.name}`,
            panel: <SubjectPanel row={row} hiddenFromStudents={hidden} />,
            detail: (
              <SubjectDetail
                row={row}
                guideHref={row.live ? studyGuideHref(row.live.code) : null}
                hiddenFromStudents={hidden}
              />
            ),
          };
        })}
      />

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
