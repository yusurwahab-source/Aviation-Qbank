import "server-only";

import { and, asc, count, eq, inArray, notInArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { attempts, classQuestions, classRatings } from "@/db/schema";
import type { QuestionOption } from "@/content/schema";

/**
 * Every read a class rating's practice flow performs — the class-content
 * mirror of `db/queries.ts`. Same two rules hold: scoped by class code, and
 * only `published` questions are ever returned to a user.
 *
 * What this file does *not* duplicate is anything downstream of a question
 * id: `db/attempts.ts`, `db/flags.ts`, `db/notes.ts`, `db/subscriptions.ts`
 * (the free tier), `db/preview.ts` and `lib/grading.ts` are all reused
 * unchanged, because none of them join to `questions`/`aircraft` — see the
 * note on `classRatings` in `db/schema.ts`.
 */

export type ClassTestQuestion = {
  id: string;
  topic: string;
  subtopic: string | null;
  question: string;
  options: QuestionOption[];
  media: string | null;
};

export type ClassAnswerKeyQuestion = ClassTestQuestion & {
  correct: string;
  explanation: string;
  reference: string | null;
};

export type ClassRatingSummary = {
  code: string;
  name: string;
  description: string;
  status: "active" | "coming_soon";
  publishedQuestions: number;
};

export type ClassTopicSummary = {
  topic: string;
  questionCount: number;
};

/** How many class ratings the bank holds, whatever their status — the class
 * rating equivalent of `countAircraft` in `db/queries.ts`, read by the
 * landing page alongside it to sum a platform-wide fact across both content
 * trees. */
export async function countClassRatings(): Promise<number> {
  const [row] = await getDb().select({ total: count() }).from(classRatings);
  return Number(row?.total ?? 0);
}

const classSummaryColumns = {
  code: classRatings.code,
  name: classRatings.name,
  description: classRatings.description,
  status: classRatings.status,
  publishedQuestions: sql<number>`count(${classQuestions.id}) filter (where ${classQuestions.status} = 'published')::int`,
};

export async function listClassRatings(): Promise<ClassRatingSummary[]> {
  return getDb()
    .select(classSummaryColumns)
    .from(classRatings)
    .leftJoin(classQuestions, eq(classQuestions.classCode, classRatings.code))
    .groupBy(classRatings.code)
    .orderBy(asc(classRatings.sortOrder), asc(classRatings.code));
}

export async function getClassRating(code: string): Promise<ClassRatingSummary | null> {
  const [row] = await getDb()
    .select(classSummaryColumns)
    .from(classRatings)
    .leftJoin(classQuestions, eq(classQuestions.classCode, classRatings.code))
    .where(eq(classRatings.code, code.toUpperCase()))
    .groupBy(classRatings.code)
    .limit(1);

  return row ?? null;
}

export async function listClassTopics(code: string): Promise<ClassTopicSummary[]> {
  const rows = await getDb()
    .select({ topic: classQuestions.topic, questionCount: count() })
    .from(classQuestions)
    .where(
      and(eq(classQuestions.classCode, code.toUpperCase()), eq(classQuestions.status, "published")),
    )
    .groupBy(classQuestions.topic)
    .orderBy(asc(classQuestions.topic));

  return rows.map((row) => ({ topic: row.topic, questionCount: Number(row.questionCount) }));
}

function publishedIn(code: string, topics: string[] = []) {
  return and(
    eq(classQuestions.classCode, code.toUpperCase()),
    eq(classQuestions.status, "published"),
    ...(topics.length > 0 ? [inArray(classQuestions.topic, topics)] : []),
  );
}

export async function countClassTestQuestions(code: string, topics: string[] = []): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(classQuestions)
    .where(publishedIn(code, topics));

  return Number(row?.total ?? 0);
}

/** `order by random()` — fine at this size; see the same note on
 * `pickTestQuestions` in `db/queries.ts`. */
export async function pickClassTestQuestions(
  code: string,
  limit: number,
  topics: string[] = [],
): Promise<ClassTestQuestion[]> {
  if (limit <= 0) return [];

  return getDb()
    .select({
      id: classQuestions.id,
      topic: classQuestions.topic,
      subtopic: classQuestions.subtopic,
      question: classQuestions.question,
      options: classQuestions.options,
      media: classQuestions.media,
    })
    .from(classQuestions)
    .where(publishedIn(code, topics))
    .orderBy(sql`random()`)
    .limit(limit);
}

/** The "Unseen questions" preset's class equivalent — see the note on
 * `pickUnseenTestQuestions` in `db/queries.ts` for what "seen" means here. */
export async function pickUnseenClassTestQuestions(
  code: string,
  userId: string,
  limit: number,
  topics: string[] = [],
): Promise<ClassTestQuestion[]> {
  if (limit <= 0) return [];

  const seen = getDb()
    .select({ questionId: attempts.questionId })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.aircraftCode, code.toUpperCase())));

  return getDb()
    .select({
      id: classQuestions.id,
      topic: classQuestions.topic,
      subtopic: classQuestions.subtopic,
      question: classQuestions.question,
      options: classQuestions.options,
      media: classQuestions.media,
    })
    .from(classQuestions)
    .where(and(publishedIn(code, topics), notInArray(classQuestions.id, seen)))
    .orderBy(sql`random()`)
    .limit(limit);
}

export async function countUnseenClassTestQuestions(
  code: string,
  userId: string,
  topics: string[] = [],
): Promise<number> {
  const seen = getDb()
    .select({ questionId: attempts.questionId })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.aircraftCode, code.toUpperCase())));

  const [row] = await getDb()
    .select({ total: count() })
    .from(classQuestions)
    .where(and(publishedIn(code, topics), notInArray(classQuestions.id, seen)));

  return Number(row?.total ?? 0);
}

export async function getClassTestQuestionsByIds(
  code: string,
  ids: string[],
): Promise<ClassTestQuestion[]> {
  if (ids.length === 0) return [];
  const db = getDb();

  const rows = await db
    .select({
      id: classQuestions.id,
      topic: classQuestions.topic,
      subtopic: classQuestions.subtopic,
      question: classQuestions.question,
      options: classQuestions.options,
      media: classQuestions.media,
    })
    .from(classQuestions)
    .where(
      and(
        eq(classQuestions.classCode, code.toUpperCase()),
        eq(classQuestions.status, "published"),
        inArray(classQuestions.id, ids),
      ),
    );

  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row) => row !== undefined);
}

export async function getClassAnswerKey(
  code: string,
  ids: string[],
): Promise<ClassAnswerKeyQuestion[]> {
  if (ids.length === 0) return [];
  const db = getDb();

  return db
    .select({
      id: classQuestions.id,
      topic: classQuestions.topic,
      subtopic: classQuestions.subtopic,
      question: classQuestions.question,
      options: classQuestions.options,
      media: classQuestions.media,
      correct: classQuestions.correct,
      explanation: classQuestions.explanation,
      reference: classQuestions.reference,
    })
    .from(classQuestions)
    .where(
      and(
        eq(classQuestions.classCode, code.toUpperCase()),
        eq(classQuestions.status, "published"),
        inArray(classQuestions.id, ids),
      ),
    );
}
