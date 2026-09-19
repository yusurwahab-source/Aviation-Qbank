/**
 * Recomputes the per-question community stat — "N% of pilots get this right"
 * — from scratch, from `attempts`.
 *
 *   npm run stats:compute
 *
 * A question's "first attempt" is the earliest `attempts` row for a given
 * `(user_id, question_id)` pair, found with `distinct on` ordered by
 * `answered_at` — so a question one determined student has drilled ten
 * times still counts once, the same weight as everyone else who saw it
 * only once.
 *
 * A full recompute, not an incremental update: `question_stats` is emptied
 * and rebuilt in one transaction on every run, which is simplest and
 * correct at this data size, and it means a question deleted from content
 * since the last run does not linger here either. There is nothing that
 * calls this on a schedule yet — the same honest gap `sweepExpiredSessions`
 * and friends are already in, documented in CLAUDE.md rather than hidden.
 * Run it by hand, or wire it to a scheduled job, whenever the numbers are
 * worth refreshing.
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { attempts as attemptsTable, questionStats as questionStatsTable } from "../src/db/schema";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and point it at your Postgres database.",
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool);

  try {
    const now = new Date();

    const written = await db.transaction(async (tx) => {
      await tx.execute(sql`truncate table ${questionStatsTable}`);

      const result = await tx.execute(sql`
        insert into ${questionStatsTable} (question_id, first_attempts, first_attempts_correct, updated_at)
        select
          first_attempt.question_id,
          count(*)::int as first_attempts,
          count(*) filter (where first_attempt.is_correct)::int as first_attempts_correct,
          ${now}
        from (
          select distinct on (${attemptsTable.userId}, ${attemptsTable.questionId})
            ${attemptsTable.questionId} as question_id,
            ${attemptsTable.isCorrect} as is_correct
          from ${attemptsTable}
          order by ${attemptsTable.userId}, ${attemptsTable.questionId}, ${attemptsTable.answeredAt} asc
        ) as first_attempt
        group by first_attempt.question_id
      `);

      return result.rowCount ?? 0;
    });

    console.log(`Question stats recomputed. ${written} question(s) now have a cached stat.`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Computing question stats failed:");
  console.error(error);
  process.exit(1);
});
