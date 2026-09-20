import Link from "next/link";
import type { Metadata } from "next";

import { Badge, Card, PageHeading } from "@/components/ui";
import {
  getAccessSummary,
  getMostFlaggedQuestions,
  getQuestionQualitySignal,
  getSignupFunnel,
  MIN_ATTEMPTS_FOR_QUALITY_SIGNAL,
  type SignupFunnel,
} from "@/db/insights";
import { EXPIRING_SOON_DAYS, listAircraftInterest, tallyAircraftInterest } from "@/db/owner";
import { requireOwner } from "@/lib/auth/require-owner";

import { DataTable, OwnerNav, OwnerPageError, StatTile, formatDay } from "../owner-ui";

export const metadata: Metadata = { title: "Insights" };
export const dynamic = "force-dynamic";

function percentOf(part: number, whole: number): string {
  if (whole === 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

function FunnelCard({ title, funnel }: { title: string; funnel: SignupFunnel }) {
  const stages = [
    { label: "Signed up", value: funnel.signups },
    { label: "Completed a test", value: funnel.completedTest },
    { label: "Hit the paywall", value: funnel.hitPaywall },
    { label: "Redeemed a code or subscribed", value: funnel.redeemedOrSubscribed },
  ];

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <ul className="space-y-2.5">
        {stages.map((stage) => (
          <li key={stage.label} className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{stage.label}</span>
            <span className="tabular-nums text-foreground">
              {stage.value}{" "}
              <span className="text-xs text-muted-foreground">
                ({percentOf(stage.value, funnel.signups)})
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * Read-only analytics — every query here is a count or a bounded aggregate
 * against existing tables; nothing here writes to `questions` or
 * `aircraft`, and nothing links anywhere actionable. The question-quality
 * lists are a signal for the owner to act on manually through the existing
 * content workflow, not a queue with buttons.
 */
export default async function OwnerInsightsPage() {
  await requireOwner();

  let funnel7: Awaited<ReturnType<typeof getSignupFunnel>>;
  let funnel30: Awaited<ReturnType<typeof getSignupFunnel>>;
  let access: Awaited<ReturnType<typeof getAccessSummary>>;
  let quality: Awaited<ReturnType<typeof getQuestionQualitySignal>>;
  let flagged: Awaited<ReturnType<typeof getMostFlaggedQuestions>>;
  let interestTally: Awaited<ReturnType<typeof tallyAircraftInterest>>;
  let interestRows: Awaited<ReturnType<typeof listAircraftInterest>>;
  try {
    [funnel7, funnel30, access, quality, flagged, interestTally, interestRows] =
      await Promise.all([
        getSignupFunnel(7),
        getSignupFunnel(30),
        getAccessSummary(),
        getQuestionQualitySignal(),
        getMostFlaggedQuestions(),
        tallyAircraftInterest(5),
        listAircraftInterest(20),
      ]);
  } catch (error) {
    console.error("Failed to load insights:", error);
    return (
      <>
        <PageHeading title="Insights" />
        <OwnerNav current="/owner/insights" />
        <OwnerPageError detail={(error as Error).message} />
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Insights"
        subtitle="Read-only. Signals to act on through the existing content and access tools — nothing here writes anything itself."
      />
      <OwnerNav current="/owner/insights" />

      <h2 className="mb-3 text-lg font-semibold text-foreground">Signup funnel</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <FunnelCard title="Last 7 days" funnel={funnel7} />
        <FunnelCard title="Last 30 days" funnel={funnel30} />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Access right now</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Active subscriptions" value={access.activeSubscriptions} />
        <StatTile
          label={`Expiring within ${EXPIRING_SOON_DAYS} days`}
          value={access.expiringSoon}
        />
        <StatTile label="Codes redeemed this month" value={access.codesRedeemedThisMonth} />
      </div>

      <h2 className="mb-1 text-lg font-semibold text-foreground">Question quality</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        First-attempt correct rate, questions with at least {MIN_ATTEMPTS_FOR_QUALITY_SIGNAL} first
        attempts only.
      </p>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Below 25% correct <span className="font-normal text-muted-foreground">(likely broken)</span>
          </h3>
          <DataTable
            headers={["Question", "Attempts", "Correct"]}
            empty="Nothing below 25% right now."
            rowKey={(_row, index) => quality.belowThreshold[index]?.questionId ?? index}
            rows={quality.belowThreshold.map((row) => qualityRow(row))}
          />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Above 95% correct{" "}
            <span className="font-normal text-muted-foreground">(likely trivial)</span>
          </h3>
          <DataTable
            headers={["Question", "Attempts", "Correct"]}
            empty="Nothing above 95% right now."
            rowKey={(_row, index) => quality.aboveThreshold[index]?.questionId ?? index}
            rows={quality.aboveThreshold.map((row) => qualityRow(row))}
          />
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Most-flagged questions</h2>
      <DataTable
        headers={["Question", "Flags"]}
        empty="Nobody has flagged a question yet."
        rowKey={(_row, index) => flagged[index]?.questionId ?? index}
        rows={flagged.map((row) => [
          <span key="q">
            <span className="block font-mono text-xs text-muted-foreground">{row.questionId}</span>
            {row.question ? (
              <span className="question-text mt-0.5 block text-sm text-foreground">
                {row.question}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">no longer in content</span>
            )}
            {row.topic ? (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {row.aircraftCode} · {row.topic}
              </span>
            ) : null}
          </span>,
          <span key="count" className="tabular-nums">
            {row.flagCount}
          </span>,
        ])}
      />

      <div className="mb-3 mt-6 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Aircraft requests</h2>
        <Link href="/owner/interest" className="text-sm text-brand hover:underline">
          See all →
        </Link>
      </div>
      {interestTally.length > 0 ? (
        <Card className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Most asked for</h3>
          <ul className="space-y-1.5">
            {interestTally.map((row) => (
              <li key={row.aircraft} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-foreground">{row.aircraft}</span>
                <span className="tabular-nums font-semibold text-brand">{row.requests}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <DataTable
        headers={["Aircraft", "Email", "Asked"]}
        empty="Nobody has asked for an aircraft yet."
        rowKey={(_row, index) => `${interestRows[index]?.email}-${index}`}
        rows={interestRows.map((row) => [
          row.aircraft,
          <span key="email" className="break-all text-xs">
            {row.email}
          </span>,
          <span key="when" className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDay(row.createdAt)}
          </span>,
        ])}
      />
    </>
  );
}

function qualityRow(row: {
  questionId: string;
  question: string | null;
  topic: string | null;
  aircraftCode: string | null;
  attempts: number;
  correctRate: number;
}) {
  return [
    <span key="q">
      <span className="block font-mono text-xs text-muted-foreground">{row.questionId}</span>
      {row.question ? (
        <span className="question-text mt-0.5 block text-sm text-foreground">{row.question}</span>
      ) : (
        <span className="text-xs text-muted-foreground">no longer in content</span>
      )}
      {row.topic ? (
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {row.aircraftCode} · {row.topic}
        </span>
      ) : null}
    </span>,
    <span key="attempts" className="tabular-nums">
      {row.attempts}
    </span>,
    <Badge key="rate" tone={row.correctRate < 0.25 ? "incorrect" : "correct"}>
      {Math.round(row.correctRate * 100)}%
    </Badge>,
  ];
}
