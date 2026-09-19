import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Card, PageHeading } from "@/components/ui";
import { getAnswerKey, getAircraft } from "@/db/queries";
import { getFlaggedQuestionIdSet } from "@/db/flags";
import { getQuestionIdsWithNotes } from "@/db/notes";
import { getCommunityPercentCorrect } from "@/db/question-stats";
import { getCurrentUser } from "@/lib/auth/session";

import { QuestionStudyActions } from "./study-actions";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ code: string; id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `${id} — study` };
}

/**
 * A single question, looked up directly rather than drawn at random — what
 * a search result links into.
 *
 * This is deliberately not the test flow, and shows the answer immediately
 * rather than after it is "earned" by answering: the whole point of the
 * test runner withholding the key until an answer is committed is to keep a
 * *graded attempt* honest (see the note on the answer key in CLAUDE.md).
 * Looking a specific question up by id to study it is a different action —
 * closer to a reference lookup than a test — and reachable only by a
 * signed-in student following a search result they chose, never by a
 * randomly drawn test question.
 */
export default async function QuestionStudyPage({ params }: PageProps) {
  const { code, id } = await params;
  const aircraftCode = code.toUpperCase();

  const user = await getCurrentUser();
  // Search itself is signed-in only; this page is what search results link
  // to, so it stays behind the same gate rather than being a back door into
  // seeing an answer without an account.
  if (!user) redirect("/login");

  let plane;
  let question;
  let communityPercentCorrect: number | null = null;
  let flagged = false;
  let hasNote = false;

  try {
    plane = await getAircraft(aircraftCode);
    if (!plane) notFound();

    const [key, flaggedIds, notedIds] = await Promise.all([
      getAnswerKey(aircraftCode, [id]),
      getFlaggedQuestionIdSet(user.id, [id]),
      getQuestionIdsWithNotes(user.id, [id]),
    ]);
    question = key[0];
    if (!question) notFound();

    flagged = flaggedIds.has(id);
    hasNote = notedIds.has(id);

    const stats = await getCommunityPercentCorrect([id]);
    communityPercentCorrect = stats[id] ?? null;
  } catch (error) {
    return (
      <>
        <PageHeading title="Study this question" />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  return (
    <>
      <PageHeading
        eyebrow={`${plane.code} · ${question.topic}${question.subtopic ? ` · ${question.subtopic}` : ""}`}
        title="Study this question"
      />

      <Card>
        <p className="question-text font-medium text-foreground">{question.question}</p>

        {question.media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={question.media}
            alt="Diagram for this question"
            className="mt-3 max-h-72 w-full rounded-lg border border-border object-contain"
          />
        ) : null}

        <ul className="mt-4 space-y-1.5">
          {question.options.map((option) => {
            const isAnswer = option.id === question.correct;
            return (
              <li
                key={option.id}
                className={`flex flex-wrap items-start gap-x-2 gap-y-1 rounded-md border px-3 py-2 text-sm ${
                  isAnswer
                    ? "border-correct bg-correct-soft text-correct"
                    : "border-border text-muted-foreground"
                }`}
              >
                <span className="font-mono font-semibold uppercase">{option.id}</span>
                <span className="min-w-0 flex-1 basis-0 font-reading">{option.text}</span>
                {isAnswer ? (
                  <span className="basis-full text-xs font-semibold sm:basis-auto">
                    Correct answer
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="mt-4 rounded-lg bg-surface-muted p-3">
          <p className="font-reading text-sm text-foreground">{question.explanation}</p>
          {communityPercentCorrect !== null ? (
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {communityPercentCorrect}% of pilots get this right
            </p>
          ) : null}
          {question.reference ? (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              Reference
              <span className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-foreground">
                {question.reference}
              </span>
            </p>
          ) : null}
        </div>

        <QuestionStudyActions
          questionId={question.id}
          aircraftCode={plane.code}
          initialFlagged={flagged}
          hasNote={hasNote}
        />
      </Card>

      <p className="mt-6 flex flex-wrap gap-4">
        <Link href="/search" className="link-standalone text-sm font-medium text-brand hover:underline">
          ← Back to search
        </Link>
        <Link
          href={`/aircraft/${plane.code}`}
          className="link-standalone text-sm font-medium text-brand hover:underline"
        >
          {plane.code} dashboard →
        </Link>
      </p>
    </>
  );
}
