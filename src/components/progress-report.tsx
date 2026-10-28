import Link from "next/link";

import { ProgressChart } from "@/components/progress-chart";
import { ALL_QUESTIONS, buildTestHref } from "@/lib/test-options";
import { Badge, Card, EmptyState, ScoreBar } from "@/components/ui";
import type {
  PractisedAircraft,
  ProgressSummary,
  QuestionToRetry,
  TestScore,
  TopicPerformance,
} from "@/db/reports";
import { HeroButton } from "@/components/ui/hero-button";

/**
 * The report itself, shared by the overall view and the per-aircraft view.
 *
 * They differ only in scope, so they differ only in the data passed in — not
 * in a second copy of this layout.
 */

export type ProgressReportData = {
  summary: ProgressSummary;
  topics: TopicPerformance[];
  scores: TestScore[];
  retry: QuestionToRetry[];
  /** Only on the overall view; the per-aircraft view passes none. */
  aircraft?: PractisedAircraft[];
  /** Set on the per-aircraft view, which enables the retry button. */
  aircraftCode?: string;
};

export function ProgressReport({ data }: { data: ProgressReportData }) {
  const { summary, topics, scores, retry, aircraft, aircraftCode } = data;

  if (summary.answered === 0) {
    return (
      <EmptyState title="No practice recorded yet">
        Take a test while signed in and it will appear here — your score, how each topic
        went, and the questions worth another look.{" "}
        <Link href="/" className="font-medium text-brand-ink hover:underline">
          Choose a section to practise
        </Link>
      </EmptyState>
    );
  }

  return (
    <>
      <section aria-label="Overall figures">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <p className="text-sm text-muted-foreground">Overall score</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-foreground">
              {summary.percentage}%
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.correct} of {summary.answered} correct
            </p>
          </Card>
          <Card>
            <p className="text-sm text-muted-foreground">Questions answered</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-foreground">
              {summary.answered}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.questionsSeen} different {summary.questionsSeen === 1 ? "question" : "questions"}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-muted-foreground">Tests taken</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-foreground">
              {summary.testsTaken}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.lastPractised
                ? `Last practised ${summary.lastPractised.toLocaleDateString()}`
                : "Not practised yet"}
            </p>
          </Card>
        </div>
      </section>

      {/* The headline view. Placed first because it is the one that tells a
          pilot what to do next. */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Performance by topic</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Weakest first. This is where the next study session should go.
        </p>
        <ul className="mt-4 space-y-3">
          {topics.map((topic) => (
            <li key={topic.topic} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-medium text-foreground">{topic.topic}</span>
                <span className="text-sm text-muted-foreground">
                  {topic.correct}/{topic.answered} · {topic.percentage}%
                </span>
              </div>
              <div className="mt-2">
                <ScoreBar percentage={topic.percentage} tone="score" />
              </div>
              {/* The point of showing a weak topic is being able to act on it. */}
              {aircraftCode ? (
                <Link
                  href={buildTestHref(aircraftCode, { topics: [topic.topic] })}
                  className="link-standalone mt-3 text-sm font-medium text-brand-ink hover:underline"
                >
                  Practise {topic.topic} →
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Progress over time</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {scores.length === 1
            ? "One test so far. The shape of your progress appears as you take more."
            : `Your score on each of your last ${scores.length} tests, oldest first.`}
        </p>
        <Card className="mt-4">
          <ProgressChart scores={scores} />
        </Card>
      </section>

      {aircraft && aircraft.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">By aircraft</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {aircraft.map((plane) => (
              <li key={plane.code}>
                <Link href={`/progress/${plane.code}`} className="block">
                  <Card className="h-full transition hover:border-brand">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand-ink">
                          {plane.code}
                        </p>
                        <p className="mt-1 font-medium text-foreground">{plane.name}</p>
                      </div>
                      <Badge tone="brand">{plane.percentage}%</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {plane.correct} of {plane.answered} correct
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Worth another look</h2>
          {aircraftCode && retry.length > 0 ? (
            <HeroButton asChild size="sm">
              <Link
                // Every outstanding question, not a fixed slice: the button says
                // how many there are, so it has to deliver that many.
                href={buildTestHref(aircraftCode, { retryOnly: true, length: ALL_QUESTIONS })}
              >
                Retry these {retry.length > 1 ? `${retry.length} questions` : "questions"}
              </Link>
            </HeroButton>
          ) : null}
        </div>

        {retry.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing outstanding — the last time you saw each question, you got it right.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Questions you got wrong the last time you saw them. Answer one correctly and
              it drops off this list.
            </p>
            <ul className="mt-4 space-y-2">
              {retry.slice(0, 20).map((item) => (
                <li
                  key={item.questionId}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">{item.topic}</Badge>
                    {!aircraftCode ? <Badge>{item.aircraftCode}</Badge> : null}
                    {item.timesWrong > 1 ? (
                      <Badge tone="incorrect">Wrong {item.timesWrong} times</Badge>
                    ) : null}
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {item.questionId}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{item.question}</p>
                </li>
              ))}
            </ul>
            {retry.length > 20 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                …and {retry.length - 20} more.
              </p>
            ) : null}
            {!aircraftCode ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Open one aircraft to retry just its questions.
              </p>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}
