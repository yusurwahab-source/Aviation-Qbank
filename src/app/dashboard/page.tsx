import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DatabaseUnavailable } from "@/components/database-unavailable";
import { MasteryRing } from "@/components/mastery-ring";
import { ProgressChart } from "@/components/progress-chart";
import { ResumeTestBanner } from "@/components/resume-test-banner";
import { Badge, Card, EmptyState, PageHeading, ScoreBar } from "@/components/ui";
import { findIncompleteSession, type IncompleteSession } from "@/db/attempts";
import {
  getAircraftMastery,
  getMostRecentAircraftCode,
  getPracticeDates,
  getSystemMastery,
  getTotalStudyTimeSeconds,
  type AircraftMastery,
  type SystemMastery,
} from "@/db/dashboard";
import { getFlaggedQuestionIds } from "@/db/flags";
import { countUnseenTestQuestions, getAircraft } from "@/db/queries";
import {
  getQuestionIdsToRetry,
  getSummary,
  getTestHistory,
  type ProgressSummary,
  type TestHistoryEntry,
} from "@/db/reports";
import { getSiteSettings } from "@/db/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { formatStudyDuration } from "@/lib/format-duration";
import { computeStudyStreak } from "@/lib/streak";
import { buildTestHref, PRESET_COUNT_CEILING } from "@/lib/test-options";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

type QuickAccess = {
  aircraftCode: string;
  aircraftName: string;
  flaggedCount: number;
  wrongCount: number;
  unseenCount: number;
};

/**
 * The signed-in home. Split into two passes on purpose: the header and the
 * "continue" banner need only the cheap, always-relevant facts (streak,
 * totals, what is mid-way through), while mastery, exam history and quick
 * access only mean anything once `summary.answered > 0` — a brand-new
 * student never pays for those queries, and never sees the wall of zeros
 * they would otherwise produce.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let summary: ProgressSummary;
  let streak: number;
  let studyTimeSeconds: number;
  let incompleteSession: IncompleteSession | null;
  let incompleteAircraftName: string | undefined;
  let mostRecentAircraftCode: string | null;
  let aircraftMastery: AircraftMastery[] = [];
  let systemMastery: SystemMastery[] = [];
  let testHistory: TestHistoryEntry[] = [];
  let passMarkPercent = 70;
  let quickAccess: QuickAccess | null = null;

  try {
    const [summaryResult, practiceDates, studyTime, incomplete, recentAircraft] =
      await Promise.all([
        getSummary(user.id),
        getPracticeDates(user.id),
        getTotalStudyTimeSeconds(user.id),
        findIncompleteSession(user.id),
        getMostRecentAircraftCode(user.id),
      ]);

    summary = summaryResult;
    streak = computeStudyStreak(practiceDates);
    studyTimeSeconds = studyTime;
    incompleteSession = incomplete;
    mostRecentAircraftCode = recentAircraft;

    if (incompleteSession) {
      incompleteAircraftName = (await getAircraft(incompleteSession.aircraftCode))?.name;
    }

    // Everything below only means something once there is history — see the
    // note above the component.
    if (summary.answered > 0) {
      const [aircraftMasteryResult, systemMasteryResult, testHistoryResult, settings] =
        await Promise.all([
          getAircraftMastery(user.id),
          getSystemMastery(user.id),
          getTestHistory(user.id, 20),
          getSiteSettings(),
        ]);
      aircraftMastery = aircraftMasteryResult;
      systemMastery = systemMasteryResult;
      testHistory = testHistoryResult;
      passMarkPercent = settings.passMarkPercent;

      if (mostRecentAircraftCode) {
        const [plane, flaggedIds, wrongIds, unseenCount] = await Promise.all([
          getAircraft(mostRecentAircraftCode),
          getFlaggedQuestionIds(user.id, mostRecentAircraftCode),
          getQuestionIdsToRetry(user.id, mostRecentAircraftCode, PRESET_COUNT_CEILING),
          countUnseenTestQuestions(mostRecentAircraftCode, user.id),
        ]);
        quickAccess = {
          aircraftCode: mostRecentAircraftCode,
          aircraftName: plane?.name ?? mostRecentAircraftCode,
          flaggedCount: flaggedIds.length,
          wrongCount: wrongIds.length,
          unseenCount: Math.min(unseenCount, PRESET_COUNT_CEILING),
        };
      }
    }
  } catch (error) {
    return (
      <>
        <PageHeading title="Dashboard" />
        <DatabaseUnavailable detail={(error as Error).message} />
      </>
    );
  }

  const greeting = `Hello, ${user.email.split("@")[0]}`;
  const isNewStudent = summary.answered === 0;
  // Only systems and aircraft this student has actually opened — an aircraft
  // or system never touched reading "0% mastered" is a wall of zeros, not
  // information.
  const touchedAircraft = aircraftMastery.filter((entry) => entry.attempted > 0);
  const touchedSystems = systemMastery.filter((entry) => entry.attempted > 0);
  // Chronological order for the chart; the table beside it stays newest first.
  const recentScores = testHistory.slice(0, 10).reverse();

  return (
    <>
      <PageHeading title={greeting} />

      <section aria-label="Your activity" className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Study streak</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight text-foreground">
            {streak} {streak === 1 ? "day" : "days"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {streak > 0 ? "Keep it going." : "Answer a question today to start one."}
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
          <p className="text-sm text-muted-foreground">Total study time</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight text-foreground">
            {formatStudyDuration(studyTimeSeconds)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Across {summary.testsTaken} finished {summary.testsTaken === 1 ? "test" : "tests"}
          </p>
        </Card>
      </section>

      <section className="mt-8">
        {incompleteSession ? (
          <ResumeTestBanner session={incompleteSession} aircraftName={incompleteAircraftName} />
        ) : isNewStudent ? (
          <EmptyState title="Take your first test to get started">
            Pick an aircraft, choose a section or two, and see how you do. Your streak, your
            mastery by system and your exam history all start from here.
            <div className="mt-3">
              <Link
                href="/aircraft"
                className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
              >
                Choose an aircraft
              </Link>
            </div>
          </EmptyState>
        ) : mostRecentAircraftCode ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Continue where you left off</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A quick, adaptive warm-up on {mostRecentAircraftCode} — weighted towards what you
                have not seen or got wrong last time.
              </p>
            </div>
            <Link
              href={buildTestHref(mostRecentAircraftCode, { from: "smart", length: 10 })}
              className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
            >
              Start a 10-question warm-up
            </Link>
          </div>
        ) : null}
      </section>

      {isNewStudent ? null : (
        <>
          {touchedAircraft.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-foreground">Overall mastery</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Questions whose most recent attempt you got right, out of every published
                question on that type.
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                {touchedAircraft.map((entry) => (
                  <Card key={entry.aircraftCode} className="flex items-center gap-4">
                    <MasteryRing
                      percentage={entry.percentage}
                      label={`${entry.aircraftCode}: ${entry.percentage}% mastered`}
                    />
                    <div>
                      <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand">
                        {entry.aircraftCode}
                      </p>
                      <p className="text-sm font-medium text-foreground">{entry.aircraftName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {entry.mastered}/{entry.total} mastered
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {touchedSystems.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-foreground">Mastery by system</h2>
              <p className="mt-1 text-sm text-muted-foreground">Weakest first.</p>
              <ul className="mt-4 space-y-3">
                {touchedSystems.map((system) => (
                  <li
                    key={`${system.aircraftCode}-${system.topic}`}
                    className="rounded-lg border border-border bg-surface p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="font-medium text-foreground">
                        <Badge tone="brand">{system.aircraftCode}</Badge>{" "}
                        <span className="ml-1">{system.topic}</span>
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {system.mastered}/{system.total} correct
                      </span>
                    </div>
                    <div className="mt-2">
                      <ScoreBar percentage={system.percentage} tone="score" />
                    </div>
                    <Link
                      href={buildTestHref(system.aircraftCode, { topics: [system.topic] })}
                      className="link-standalone mt-3 text-sm font-medium text-brand hover:underline"
                    >
                      Practise {system.topic} →
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">Exam history</h2>
            {testHistory.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No finished tests yet — history appears here once you complete one.
              </p>
            ) : (
              <>
                <Card className="mt-4">
                  <ProgressChart scores={recentScores} />
                </Card>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Every finished test, most recent first</caption>
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Date
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Aircraft
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Mode
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Questions
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Score
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Result
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Time
                        </th>
                        <th scope="col" className="py-2 font-medium">
                          <span className="sr-only">Review</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {testHistory.map((entry) => (
                        <TestHistoryRow
                          key={entry.testSessionId}
                          entry={entry}
                          passMarkPercent={passMarkPercent}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">Quick access</h2>
            {quickAccess ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">On {quickAccess.aircraftName}.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <QuickAccessCard
                    title="Flagged questions"
                    count={quickAccess.flaggedCount}
                    href={buildTestHref(quickAccess.aircraftCode, { from: "flagged" })}
                    emptyNote="Flag a question mid-test to come back to it later."
                  />
                  <QuickAccessCard
                    title="Questions I got wrong"
                    count={quickAccess.wrongCount}
                    href={buildTestHref(quickAccess.aircraftCode, { retryOnly: true })}
                    emptyNote="Nothing outstanding right now."
                  />
                  <QuickAccessCard
                    title="Unseen questions"
                    count={quickAccess.unseenCount}
                    href={buildTestHref(quickAccess.aircraftCode, { from: "unseen" })}
                    emptyNote="You have seen every published question at least once."
                  />
                </div>
              </>
            ) : null}
          </section>
        </>
      )}
    </>
  );
}

function QuickAccessCard({
  title,
  count,
  href,
  emptyNote,
}: {
  title: string;
  count: number;
  href: string;
  emptyNote: string;
}) {
  if (count === 0) {
    return (
      <Card className="opacity-70">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-muted-foreground">0</p>
        <p className="mt-1 text-sm text-muted-foreground">{emptyNote}</p>
      </Card>
    );
  }

  return (
    <Link href={href} className="block h-full">
      <Card className="h-full transition hover:border-brand">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-brand">{count}</p>
        <p className="mt-1 text-sm text-muted-foreground">Start this test →</p>
      </Card>
    </Link>
  );
}

function TestHistoryRow({
  entry,
  passMarkPercent,
}: {
  entry: TestHistoryEntry;
  passMarkPercent: number;
}) {
  const passed = entry.percentage >= passMarkPercent;
  return (
    <tr className="border-b border-border">
      <td className="py-2 pr-4 whitespace-nowrap text-foreground">
        {entry.completedAt.toLocaleDateString()}
      </td>
      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{entry.aircraftCode}</td>
      <td className="py-2 pr-4 text-muted-foreground">{entry.mode === "exam" ? "Exam" : "Study"}</td>
      <td className="py-2 pr-4 text-muted-foreground">{entry.answered}</td>
      <td className="py-2 pr-4 font-medium text-foreground">{entry.percentage}%</td>
      <td className="py-2 pr-4">
        <Badge tone={passed ? "correct" : "incorrect"}>{passed ? "Pass" : "Fail"}</Badge>
      </td>
      <td className="py-2 pr-4 text-muted-foreground">
        {entry.timeTakenSeconds !== null ? `${Math.round(entry.timeTakenSeconds / 60)}m` : "—"}
      </td>
      <td className="py-2">
        <Link
          href={`/progress/tests/${entry.testSessionId}`}
          className="link-standalone text-sm font-medium text-brand hover:underline"
        >
          Review
        </Link>
      </td>
    </tr>
  );
}
