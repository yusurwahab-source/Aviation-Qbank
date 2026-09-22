/**
 * Applies any pending database migrations from /drizzle.
 *
 *   npm run db:migrate
 *
 * Safe to run repeatedly: every migration ever applied is recorded by the
 * sha256 of its own file content, in `drizzle.__drizzle_migrations` — the
 * same table `drizzle-orm`'s own migrator uses, kept schema-compatible with
 * it on purpose (see below).
 *
 * This does **not** call `drizzle-orm/node-postgres/migrator`'s `migrate()`.
 * That function's own check (`pg-core/dialect.js`) reads only the *single
 * most recent* row in the tracking table and applies any local migration
 * whose own timestamp is greater than that one row's `created_at` — it
 * never compares by hash against the full set of rows. A migration is
 * silently skipped, with no error, if the table's latest recorded
 * timestamp is ever equal to or ahead of a new migration's timestamp,
 * whatever the reason. That happened here: `0019_rapid_eternals` was
 * generated on this branch a good while before it reached production, and
 * by the time it did, `drizzle`'s own tracking table already held a later
 * timestamp — from a migration generated afterwards on a different branch,
 * merged first. `db:migrate` reported "up to date" and exited 0, and
 * `db:seed` then failed with `relation "flying_knowledge_subjects" does
 * not exist` on a page the build had already reported successful. A
 * migration's generation time was never a promise about deployment order,
 * and nothing here should depend on it being one.
 *
 * This reads every migration file (`readMigrationFiles`, drizzle-orm's own
 * export — the exact function the built-in migrator itself calls, so the
 * on-disk parsing is unchanged), then applies exactly the ones whose hash
 * is not already in the tracking table, in journal order, inside one
 * transaction. A hash is unique to a file's exact content, so this is
 * correct however migrations were generated across sessions, branches or
 * clocks — nothing here reads or trusts a timestamp to decide what is
 * pending, only to record when a migration was written, same as before.
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const MIGRATIONS_SCHEMA = "drizzle";
const MIGRATIONS_TABLE = "__drizzle_migrations";

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
    const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });

    await db.execute(sql`create schema if not exists ${sql.identifier(MIGRATIONS_SCHEMA)}`);
    await db.execute(sql`
      create table if not exists ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)} (
        id serial primary key,
        hash text not null,
        created_at bigint
      )
    `);

    const appliedRows = await db.execute<{ hash: string }>(
      sql`select hash from ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)}`,
    );
    const appliedHashes = new Set(appliedRows.rows.map((row) => row.hash));

    const pending = migrations.filter((migration) => !appliedHashes.has(migration.hash));

    if (pending.length === 0) {
      console.log("Migrations are up to date.");
      return;
    }

    await db.transaction(async (tx) => {
      for (const migration of pending) {
        for (const statement of migration.sql) {
          await tx.execute(sql.raw(statement));
        }
        await tx.execute(sql`
          insert into ${sql.identifier(MIGRATIONS_SCHEMA)}.${sql.identifier(MIGRATIONS_TABLE)} ("hash", "created_at")
          values (${migration.hash}, ${migration.folderMillis})
        `);
      }
    });

    console.log(`Applied ${pending.length} migration(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Migration failed:");
  console.error(error);
  process.exit(1);
});
