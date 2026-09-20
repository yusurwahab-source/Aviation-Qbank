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
import { loadClassContent } from "../src/content/load-classes";
import {
  aircraft as aircraftTable,
  classQuestions as classQuestionsTable,
  classRatings as classRatingsTable,
  questions as questionsTable,
} from "../src/db/schema";
import type {
  AircraftInsert,
  ClassQuestionInsert,
  ClassRatingInsert,
  QuestionInsert,
} from "../src/db/schema";

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
  const { classes: classContent, issues: classIssues } = loadClassContent();
  if (issues.length > 0 || classIssues.length > 0) {
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
          category: manifest.category,
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
              category: aircraftRow.category,
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
          category: question.category ?? manifest.category,
          topic: question.topic,
          subtopic: question.subtopic ?? null,
          question: question.question,
          options: question.options,
          correct: question.correct,
          explanation: question.explanation,
          reference: question.reference ?? null,
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
                category: sql`excluded.category`,
                topic: sql`excluded.topic`,
                subtopic: sql`excluded.subtopic`,
                question: sql`excluded.question`,
                options: sql`excluded.options`,
                correct: sql`excluded.correct`,
                explanation: sql`excluded.explanation`,
                reference: sql`excluded.reference`,
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

      // Class ratings: the same sync, against the separate class tables —
      // see the note on `classRatings` in `db/schema.ts` for why this is a
      // second pair of tables rather than a "kind" column on the ones above.
      for (const { manifest, questions } of classContent) {
        const classRow: ClassRatingInsert = {
          code: manifest.code,
          name: manifest.name,
          description: manifest.description,
          status: manifest.status,
          sortOrder: manifest.sortOrder,
          updatedAt: now,
        };

        await tx
          .insert(classRatingsTable)
          .values(classRow)
          .onConflictDoUpdate({
            target: classRatingsTable.code,
            set: {
              name: classRow.name,
              description: classRow.description,
              status: classRow.status,
              sortOrder: classRow.sortOrder,
              updatedAt: now,
            },
          });

        const classRows: ClassQuestionInsert[] = questions.map((question) => ({
          id: question.id,
          classCode: question.classCode,
          topic: question.topic,
          subtopic: question.subtopic ?? null,
          question: question.question,
          options: question.options,
          correct: question.correct,
          explanation: question.explanation,
          reference: question.reference ?? null,
          media: question.media ?? null,
          tags: question.tags ?? [],
          status: question.status,
          version: question.version,
          updatedAt: now,
        }));

        if (classRows.length > 0) {
          await tx
            .insert(classQuestionsTable)
            .values(classRows)
            .onConflictDoUpdate({
              target: classQuestionsTable.id,
              set: {
                classCode: sql`excluded.class_code`,
                topic: sql`excluded.topic`,
                subtopic: sql`excluded.subtopic`,
                question: sql`excluded.question`,
                options: sql`excluded.options`,
                correct: sql`excluded.correct`,
                explanation: sql`excluded.explanation`,
                reference: sql`excluded.reference`,
                media: sql`excluded.media`,
                tags: sql`excluded.tags`,
                status: sql`excluded.status`,
                version: sql`excluded.version`,
                updatedAt: now,
              },
            });
        }

        const classKeepIds = classRows.map((row) => row.id);
        const removedClassQuestions = await tx
          .delete(classQuestionsTable)
          .where(
            classKeepIds.length > 0
              ? and(
                  eq(classQuestionsTable.classCode, manifest.code),
                  notInArray(classQuestionsTable.id, classKeepIds),
                )
              : eq(classQuestionsTable.classCode, manifest.code),
          )
          .returning({ id: classQuestionsTable.id });

        const classPublished = questions.filter((q) => q.status === "published").length;
        const removedClassNote =
          removedClassQuestions.length > 0 ? `, ${removedClassQuestions.length} removed` : "";
        console.log(
          `${manifest.code}  ${classPublished} published, ${questions.length - classPublished} draft${removedClassNote}`,
        );
      }

      const keepClassCodes = classContent.map((entry) => entry.manifest.code);
      if (keepClassCodes.length > 0) {
        const removedClasses = await tx
          .delete(classRatingsTable)
          .where(notInArray(classRatingsTable.code, keepClassCodes))
          .returning({ code: classRatingsTable.code });
        for (const { code } of removedClasses) {
          console.log(`${code}  removed (no content folder)`);
        }
      }
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(questionsTable)
      .where(inArray(questionsTable.status, ["published"]));

    const [{ count: classCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(classQuestionsTable)
      .where(inArray(classQuestionsTable.status, ["published"]));

    console.log(
      `\nSeed complete. ${count} published question(s) available to users, ${classCount} in class ratings.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed:");
  console.error(error);
  process.exit(1);
});
