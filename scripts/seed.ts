/**
 * Loads validated content from /content into the database.
 *
 *   npm run db:seed
 *
 * The content files are the source of truth, so the seed is a sync, not an
 * append: questions are inserted or updated by id, and any question in the
 * database whose file has been deleted is removed. Running it twice in a row
 * changes nothing the second time.
 */
import { config } from "dotenv";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { loadContent } from "../src/content/load";
import { aircraft as aircraftTable, questions as questionsTable } from "../src/db/schema";
import type { AircraftInsert, QuestionInsert } from "../src/db/schema";

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

  // The seed never guesses. If content is broken, stop before touching the database.
  const { aircraft: content, issues } = loadContent();
  if (issues.length > 0) {
    console.error("Content is invalid, nothing was written. Run `npm run validate:content`.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool);
  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      for (const { manifest, questions } of content) {
        const aircraftRow: AircraftInsert = {
          code: manifest.code,
          name: manifest.name,
          manufacturer: manifest.manufacturer,
          variant: manifest.variant ?? null,
          description: manifest.description,
          status: manifest.status,
          sortOrder: manifest.sortOrder,
          updatedAt: now,
        };

        await tx
          .insert(aircraftTable)
          .values(aircraftRow)
          .onConflictDoUpdate({
            target: aircraftTable.code,
            set: {
              name: aircraftRow.name,
              manufacturer: aircraftRow.manufacturer,
              variant: aircraftRow.variant,
              description: aircraftRow.description,
              status: aircraftRow.status,
              sortOrder: aircraftRow.sortOrder,
              updatedAt: now,
            },
          });

        const rows: QuestionInsert[] = questions.map((question) => ({
          id: question.id,
          aircraftCode: question.aircraft,
          topic: question.topic,
          subtopic: question.subtopic ?? null,
          question: question.question,
          options: question.options,
          correct: question.correct,
          explanation: question.explanation,
          reference: question.reference ?? null,
          difficulty: question.difficulty,
          media: question.media ?? null,
          tags: question.tags ?? [],
          status: question.status,
          version: question.version,
          updatedAt: now,
        }));

        if (rows.length > 0) {
          await tx
            .insert(questionsTable)
            .values(rows)
            .onConflictDoUpdate({
              target: questionsTable.id,
              set: {
                aircraftCode: sql`excluded.aircraft_code`,
                topic: sql`excluded.topic`,
                subtopic: sql`excluded.subtopic`,
                question: sql`excluded.question`,
                options: sql`excluded.options`,
                correct: sql`excluded.correct`,
                explanation: sql`excluded.explanation`,
                reference: sql`excluded.reference`,
                difficulty: sql`excluded.difficulty`,
                media: sql`excluded.media`,
                tags: sql`excluded.tags`,
                status: sql`excluded.status`,
                version: sql`excluded.version`,
                updatedAt: now,
              },
            });
        }

        // Remove questions that no longer exist in the files for this aircraft.
        const keepIds = rows.map((row) => row.id);
        const removed = await tx
          .delete(questionsTable)
          .where(
            keepIds.length > 0
              ? and(
                  eq(questionsTable.aircraftCode, manifest.code),
                  notInArray(questionsTable.id, keepIds),
                )
              : eq(questionsTable.aircraftCode, manifest.code),
          )
          .returning({ id: questionsTable.id });

        const published = questions.filter((q) => q.status === "published").length;
        const removedNote = removed.length > 0 ? `, ${removed.length} removed` : "";
        console.log(
          `${manifest.code}  ${published} published, ${questions.length - published} draft${removedNote}`,
        );
      }

      // Remove aircraft whose content folder has been deleted.
      const keepCodes = content.map((entry) => entry.manifest.code);
      if (keepCodes.length > 0) {
        const removedAircraft = await tx
          .delete(aircraftTable)
          .where(notInArray(aircraftTable.code, keepCodes))
          .returning({ code: aircraftTable.code });
        for (const { code } of removedAircraft) {
          console.log(`${code}  removed (no content folder)`);
        }
      }
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(questionsTable)
      .where(inArray(questionsTable.status, ["published"]));

    console.log(`\nSeed complete. ${count} published question(s) available to users.`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed:");
  console.error(error);
  process.exit(1);
});
