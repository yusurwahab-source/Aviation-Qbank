import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "@/db";
import { EXPIRING_SOON_DAYS } from "@/db/owner";

/**
 * Read-only analytics for the owner. Every query here is a `count` or a
 * bounded aggregate — nothing loads a full table into memory, and nothing
 * here ever writes to `questions` or `aircraft`.
 *
 * A word on the one query that is genuinely expensive: `getQuestionQuality`
 * builds a `distinct on (question_id, user_id)` over the whole of
 * `attempts` to find each user's *first* attempt at each question. The
 * `attempts_question_id_idx` index (added alongside this dashboard) lets
 * Postgres avoid a full table scan per question, but a composite index
 * covering `(question_id, user_id, answered_at)` would serve the `distinct
 * on`'s own ordering directly and is the first thing to add if this page
 * gets slow on a bank with a lot of history — deferred for now because that
 * index would only ever serve this one, owner-only page, at the cost of
 * extra width on a table every answer already writes to. This module was
 * developed without a live Postgres connection available (see the
 * discovery note in the PR), so query plans here are reasoned about, not
 * measured — worth an `EXPLAIN ANALYZE` against a real bank before trusting
 * this note over the actual planner.
 */

export type SignupFunnel = {
  signups: number;
  completedTest: number;
  hitPaywall: number;
  redeemedOrSubscribed: number;
};

/**
 * The funnel for accounts created in the last `days` days: how many of
 * *that* cohort went on to finish a test, hit the paywall, and redeem a
 * code or subscribe — not four independent counts of unrelated events, so
 * each stage is a subset of the one before it.
 *
 * One query, one scan of `users` bounded by `users_created_at_idx`, with an
 * `exists` per stage rather than a join — a join to `test_sessions` or
 * `attempts` here would multiply the user row by every session or answer,
 * exactly the reason `listAccounts` in `db/owner.ts` already avoids joins
 * for its own activity counts.
 */
export async function getSignupFunnel(days: number): Promise<SignupFunnel> {
  const { rows } = await getDb().execute<{
    signups: number;
    completed_test: number;
    hit_paywall: number;
    redeemed_or_subscribed: number;
  }>(sql`
    select
      count(*)::int as signups,
      count(*) filter (
        where exists (
          select 1 from test_sessions ts
          where ts.user_id = u.id and ts.completed_at is not null
        )
      )::int as completed_test,
      count(*) filter (
        where exists (select 1 from paywall_hits ph where ph.user_id = u.id)
      )::int as hit_paywall,
      count(*) filter (
        where exists (select 1 from subscriptions s where s.user_id = u.id)
           or exists (select 1 from gift_code_redemptions gcr where gcr.user_id = u.id)
      )::int as redeemed_or_subscribed
    from users u
    where u.created_at >= now() - make_interval(days => ${days})
  `);
  const row = rows[0];

  return {
    signups: row?.signups ?? 0,
    completedTest: row?.completed_test ?? 0,
    hitPaywall: row?.hit_paywall ?? 0,
    redeemedOrSubscribed: row?.redeemed_or_subscribed ?? 0,
  };
}

export type AccessSummary = {
  activeSubscriptions: number;
  expiringSoon: number;
  codesRedeemedThisMonth: number;
};

/**
 * Three counts, each served by an index that filters on its own columns
 * alone: `subscriptions_status_period_end_idx` for the first two,
 * `gift_code_redemptions_redeemed_at_idx` for the third.
 */
export async function getAccessSummary(): Promise<AccessSummary> {
  const { rows } = await getDb().execute<{
    active_subscriptions: number;
    expiring_soon: number;
    codes_redeemed_this_month: number;
  }>(sql`
    select
      (
        select count(*)::int from subscriptions
        where status = 'active' and current_period_end > now()
      ) as active_subscriptions,
      (
        select count(*)::int from subscriptions
        where status = 'active'
          and current_period_end > now()
          and current_period_end <= now() + make_interval(days => ${EXPIRING_SOON_DAYS})
      ) as expiring_soon,
      (
        select count(*)::int from gift_code_redemptions
        where redeemed_at >= date_trunc('month', now())
      ) as codes_redeemed_this_month
  `);
  const row = rows[0];

  return {
    activeSubscriptions: row?.active_subscriptions ?? 0,
    expiringSoon: row?.expiring_soon ?? 0,
    codesRedeemedThisMonth: row?.codes_redeemed_this_month ?? 0,
  };
}

export type QuestionQualityRow = {
  questionId: string;
  attempts: number;
  correctRate: number;
  /** Null when the question no longer exists in content. */
  question: string | null;
  topic: string | null;
  aircraftCode: string | null;
};

/** Only questions with at least this many first attempts are surfaced —
 * below this, a rate is noise, not a signal. */
export const MIN_ATTEMPTS_FOR_QUALITY_SIGNAL = 20;

const LOW_CORRECT_RATE = 0.25;
const HIGH_CORRECT_RATE = 0.95;

/**
 * First-attempt correct rate per question, split into two read-only lists:
 * likely broken (below 25%) and likely trivial (above 95%), each requiring
 * at least 20 first attempts to appear at all.
 *
 * "First attempt" is each `(question_id, user_id)` pair's earliest row by
 * `answered_at` — a student who got a question wrong once and right on a
 * retry should not inflate the rate as if it were two independent tries at
 * the same difficulty. The CTE computes that with `distinct on`, then
 * aggregates by question — see the module doc for the cost of this query.
 */
export async function getQuestionQualitySignal(): Promise<{
  belowThreshold: QuestionQualityRow[];
  aboveThreshold: QuestionQualityRow[];
}> {
  const { rows } = await getDb().execute<{
    question_id: string;
    attempts: number;
    correct_rate: number;
    question: string | null;
    topic: string | null;
    aircraft_code: string | null;
  }>(sql`
    with first_attempts as (
      select distinct on (a.question_id, a.user_id)
        a.question_id, a.is_correct
      from attempts a
      order by a.question_id, a.user_id, a.answered_at
    ),
    by_question as (
      select
        question_id,
        count(*)::int as attempts,
        avg(is_correct::int)::float as correct_rate
      from first_attempts
      group by question_id
      having count(*) >= ${MIN_ATTEMPTS_FOR_QUALITY_SIGNAL}
    )
    select
      by_question.question_id,
      by_question.attempts,
      by_question.correct_rate,
      q.question,
      q.topic,
      q.aircraft_code
    from by_question
    left join questions q on q.id = by_question.question_id
    where by_question.correct_rate < ${LOW_CORRECT_RATE} or by_question.correct_rate > ${HIGH_CORRECT_RATE}
    order by by_question.correct_rate asc
  `);

  const mapped: QuestionQualityRow[] = rows.map((row) => ({
    questionId: row.question_id,
    attempts: row.attempts,
    correctRate: row.correct_rate,
    question: row.question,
    topic: row.topic,
    aircraftCode: row.aircraft_code,
  }));

  return {
    belowThreshold: mapped.filter((row) => row.correctRate < LOW_CORRECT_RATE),
    aboveThreshold: mapped
      .filter((row) => row.correctRate > HIGH_CORRECT_RATE)
      .sort((a, b) => b.correctRate - a.correctRate),
  };
}

export type FlaggedQuestionRow = {
  questionId: string;
  flagCount: number;
  question: string | null;
  topic: string | null;
  aircraftCode: string | null;
};

/**
 * The most-flagged questions, count-desc. `question_flags_question_id_idx`
 * (added alongside this dashboard) is what lets the `group by` avoid
 * scanning every flag in the table to build the aggregate.
 */
export async function getMostFlaggedQuestions(limit = 50): Promise<FlaggedQuestionRow[]> {
  const { rows } = await getDb().execute<{
    question_id: string;
    flag_count: number;
    question: string | null;
    topic: string | null;
    aircraft_code: string | null;
  }>(sql`
    select
      qf.question_id,
      count(*)::int as flag_count,
      q.question,
      q.topic,
      q.aircraft_code
    from question_flags qf
    left join questions q on q.id = qf.question_id
    group by qf.question_id, q.question, q.topic, q.aircraft_code
    order by flag_count desc
    limit ${limit}
  `);

  return rows.map((row) => ({
    questionId: row.question_id,
    flagCount: row.flag_count,
    question: row.question,
    topic: row.topic,
    aircraftCode: row.aircraft_code,
  }));
}
