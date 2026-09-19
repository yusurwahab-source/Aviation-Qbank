import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Badge, Card, PageHeading, ScoreBar } from "@/components/ui";
import { getAircraft } from "@/db/queries";
import { getTestSessionReview } from "@/db/reports";
import { getSiteSettings } from "@/db/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { formatClock } from "@/lib/test-options";

export const metadata: Metadata = { title: "Test review" };
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

/**
 * The full, question-by-question record of one finished test — what a row
 * in the dashboard's exam history links to. Read-only: this is history, not
 * a test in progress, so there is nothing here to retake or settle, only to
 * look back over.
 */
export default async function TestReviewPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let review;
  let aircraftName: string | undefined;
  let passMarkPercent: number;

  try {
    review = await getTestSessionReview(user.id, id);
    if (!review) notFound();
    const [plane, settings] = await Promise.all([
      getAircraft(review.aircraftCode),
      getSiteSettings(),
    ]);
    aircraftName = plane?.name;
    passMarkPercent = settings.passMarkPercent;
  } catch (error) {
    return (
      <>
        <PageHeading title="Test review" />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  const { result } = review;
  const passed = result.percentage >= passMarkPercent;

  return (
    <>
      <PageHeading
        eyebrow={`${review.aircraftCode} · ${aircraftName ?? review.aircraftCode}`}
        title="Test review"
        subtitle={`${review.mode === "exam" ? "Exam" : "Study"} · ${review.completedAt.toLocaleString()}`}
      />

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-4xl font-semibold tracking-tight text-foreground">
                {result.percentage}%
              </p>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                  passed ? "bg-correct-soft text-correct" : "bg-incorrect-soft text-incorrect"
                }`}
              >
                {passed ? "Pass" : "Not a pass"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.correct} of {result.total} correct
              {result.unanswered > 0 ? ` · ${result.unanswered} left unanswered` : ""} · pass mark{" "}
              {passMarkPercent}%
            </p>
          </div>
          {review.timeTakenSeconds !== null ? (
            <p className="text-sm text-muted-foreground">
              Time taken{" "}
              <span className="font-mono font-medium text-foreground">
                {formatClock(review.timeTakenSeconds)}
              </span>
            </p>
          ) : null}
        </div>
        <div className="mt-4">
          <ScoreBar percentage={result.percentage} tone="score" />
        </div>
      </Card>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">How each topic went</h2>
        <ul className="mt-3 space-y-3">
          {result.byTopic.map((topic) => (
            <li key={topic.topic} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{topic.topic}</span>
                <span className="text-sm text-muted-foreground">
                  {topic.correct}/{topic.total} · {topic.percentage}%
                </span>
              </div>
              <div className="mt-2">
                <ScoreBar percentage={topic.percentage} tone="score" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">Every question</h2>
        <ul className="mt-3 space-y-4">
          {result.graded.map((entry, position) => {
            const { question, isCorrect, wasAnswered, selectedOptionId } = entry;
            return (
              <li key={question.id}>
                <Card
                  className={isCorrect ? "border-l-4 border-l-correct" : "border-l-4 border-l-incorrect"}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Q{position + 1}
                    </span>
                    <Badge tone="brand">{question.topic}</Badge>
                    {isCorrect ? (
                      <Badge tone="correct">Correct</Badge>
                    ) : (
                      <Badge tone="incorrect">{wasAnswered ? "Incorrect" : "Not answered"}</Badge>
                    )}
                  </div>
                  <p className="question-text mt-3 font-medium text-foreground">
                    {question.question}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {question.options.map((option) => {
                      const isAnswer = option.id === question.correct;
                      const isChosen = option.id === selectedOptionId;
                      const tone = isAnswer
                        ? "border-correct bg-correct-soft text-correct"
                        : isChosen
                          ? "border-incorrect bg-incorrect-soft text-incorrect"
                          : "border-border text-muted-foreground";
                      return (
                        <li
                          key={option.id}
                          className={`flex flex-wrap items-start gap-x-2 gap-y-1 rounded-md border px-3 py-2 text-sm ${tone}`}
                        >
                          <span className="font-mono font-semibold uppercase">{option.id}</span>
                          <span className="min-w-0 flex-1 basis-0">{option.text}</span>
                          {isAnswer ? (
                            <span className="basis-full text-xs font-semibold sm:basis-auto">
                              Correct answer
                            </span>
                          ) : isChosen ? (
                            <span className="basis-full text-xs font-semibold sm:basis-auto">
                              Your answer
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-3 rounded-lg bg-surface-muted p-3">
                    <p className="font-reading text-sm text-foreground">{question.explanation}</p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-8">
        <Link href="/dashboard" className="link-standalone text-sm font-medium text-brand hover:underline">
          ← Back to dashboard
        </Link>
      </p>
    </>
  );
}
