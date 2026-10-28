import "server-only";

import { and, asc, count, eq, inArray, notInArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { attempts, flyingKnowledgeQuestions, flyingKnowledgeSubjects } from "@/db/schema";
import type { QuestionOption } from "@/content/schema";

/**
 * Every read Flying Knowledge's practice flow performs — a third mirror of
 * `db/queries.ts`, alongside `db/class-queries.ts`. Same two rules hold:
 * scoped by subject code, and only `published` questions are ever returned
 * to a user.
 *
 * What this file does *not* duplicate is anything downstream of a question
 * id: `db/attempts.ts`, `db/flags.ts`, `db/notes.ts` and `lib/grading.ts` are
 * all reused unchanged, because none of them join to
 * `flyingKnowledgeQuestions`/`flyingKnowledgeSubjects` — see the note on
 * `flyingKnowledgeSubjects` in `db/schema.ts`.
 *
 * What is *not* reused, deliberately: `db/subscriptions.ts`'s free-tier
 * checks and `db/preview.ts`'s signed-out allowance. Flying Knowledge is
 * free in full — see `CLAUDE.md` — so nothing here is ever checked against
 * either.
 */

export type FlyingKnowledgeTestQuestion = {
  id: string;
  topic: string;
  subtopic: string | null;
  question: string;
  options: QuestionOption[];
  media: string | null;
};

export type FlyingKnowledgeAnswerKeyQuestion = FlyingKnowledgeTestQuestion & {
  correct: string;
  explanation: string;
  reference: string | null;
};

export type FlyingKnowledgeSubjectSummary = {
  code: string;
  name: string;
  description: string;
  status: "active" | "coming_soon";
  publishedQuestions: number;
};

export type FlyingKnowledgeTopicSummary = {
  topic: string;
  questionCount: number;
};

/** How many Flying Knowledge subjects the bank holds, whatever their
 * status — the same fact `countAircraft` and `countClassRatings` report for
 * their own trees, read by the landing page alongside them. */
export async function countFlyingKnowledgeSubjects(): Promise<number> {
  const [row] = await getDb().select({ total: count() }).from(flyingKnowledgeSubjects);
  return Number(row?.total ?? 0);
}

const subjectSummaryColumns = {
  code: flyingKnowledgeSubjects.code,
  name: flyingKnowledgeSubjects.name,
  description: flyingKnowledgeSubjects.description,
  status: flyingKnowledgeSubjects.status,
  publishedQuestions: sql<number>`count(${flyingKnowledgeQuestions.id}) filter (where ${flyingKnowledgeQuestions.status} = 'published')::int`,
};

export async function listFlyingKnowledgeSubjects(): Promise<FlyingKnowledgeSubjectSummary[]> {
  return getDb()
    .select(subjectSummaryColumns)
    .from(flyingKnowledgeSubjects)
    .leftJoin(
      flyingKnowledgeQuestions,
      eq(flyingKnowledgeQuestions.subjectCode, flyingKnowledgeSubjects.code),
    )
    .groupBy(flyingKnowledgeSubjects.code)
    .orderBy(asc(flyingKnowledgeSubjects.sortOrder), asc(flyingKnowledgeSubjects.code));
}

export async function getFlyingKnowledgeSubject(
  code: string,
): Promise<FlyingKnowledgeSubjectSummary | null> {
  const [row] = await getDb()
    .select(subjectSummaryColumns)
    .from(flyingKnowledgeSubjects)
    .leftJoin(
      flyingKnowledgeQuestions,
      eq(flyingKnowledgeQuestions.subjectCode, flyingKnowledgeSubjects.code),
    )
    .where(eq(flyingKnowledgeSubjects.code, code.toUpperCase()))
    .groupBy(flyingKnowledgeSubjects.code)
    .limit(1);

  return row ?? null;
}

export async function listFlyingKnowledgeTopics(
  code: string,
): Promise<FlyingKnowledgeTopicSummary[]> {
  const rows = await getDb()
    .select({ topic: flyingKnowledgeQuestions.topic, questionCount: count() })
    .from(flyingKnowledgeQuestions)
    .where(
      and(
        eq(flyingKnowledgeQuestions.subjectCode, code.toUpperCase()),
        eq(flyingKnowledgeQuestions.status, "published"),
      ),
    )
    .groupBy(flyingKnowledgeQuestions.topic)
    .orderBy(asc(flyingKnowledgeQuestions.topic));

  return rows.map((row) => ({ topic: row.topic, questionCount: Number(row.questionCount) }));
}

export type FlyingKnowledgeChapterSummary = FlyingKnowledgeTopicSummary & {
  subjectCode: string;
};

/** Every subject's chapters (its topics) with their published question
 * counts, in one query — the ATPL Ground School page shows all of them at
 * once, and thirteen round trips for one page would be the wrong trade. */
export async function listFlyingKnowledgeChapters(): Promise<FlyingKnowledgeChapterSummary[]> {
  const rows = await getDb()
    .select({
      subjectCode: flyingKnowledgeQuestions.subjectCode,
      topic: flyingKnowledgeQuestions.topic,
      questionCount: count(),
    })
    .from(flyingKnowledgeQuestions)
    .where(eq(flyingKnowledgeQuestions.status, "published"))
    .groupBy(flyingKnowledgeQuestions.subjectCode, flyingKnowledgeQuestions.topic)
    .orderBy(asc(flyingKnowledgeQuestions.subjectCode), asc(flyingKnowledgeQuestions.topic));

  return rows.map((row) => ({ ...row, questionCount: Number(row.questionCount) }));
}

function publishedIn(code: string, topics: string[] = []) {
  return and(
    eq(flyingKnowledgeQuestions.subjectCode, code.toUpperCase()),
    eq(flyingKnowledgeQuestions.status, "published"),
    ...(topics.length > 0 ? [inArray(flyingKnowledgeQuestions.topic, topics)] : []),
  );
}

export async function countFlyingKnowledgeTestQuestions(
  code: string,
  topics: string[] = [],
): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(flyingKnowledgeQuestions)
    .where(publishedIn(code, topics));

  return Number(row?.total ?? 0);
}

/** `order by random()` — fine at this size; see the same note on
 * `pickTestQuestions` in `db/queries.ts`. */
export async function pickFlyingKnowledgeTestQuestions(
  code: string,
  limit: number,
  topics: string[] = [],
): Promise<FlyingKnowledgeTestQuestion[]> {
  if (limit <= 0) return [];

  return getDb()
    .select({
      id: flyingKnowledgeQuestions.id,
      topic: flyingKnowledgeQuestions.topic,
      subtopic: flyingKnowledgeQuestions.subtopic,
      question: flyingKnowledgeQuestions.question,
      options: flyingKnowledgeQuestions.options,
      media: flyingKnowledgeQuestions.media,
    })
    .from(flyingKnowledgeQuestions)
    .where(publishedIn(code, topics))
    .orderBy(sql`random()`)
    .limit(limit);
}

/** The "Unseen questions" preset's Flying Knowledge equivalent — see the
 * note on `pickUnseenTestQuestions` in `db/queries.ts` for what "seen"
 * means here. */
export async function pickUnseenFlyingKnowledgeTestQuestions(
  code: string,
  userId: string,
  limit: number,
  topics: string[] = [],
): Promise<FlyingKnowledgeTestQuestion[]> {
  if (limit <= 0) return [];

  const seen = getDb()
    .select({ questionId: attempts.questionId })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.aircraftCode, code.toUpperCase())));

  return getDb()
    .select({
      id: flyingKnowledgeQuestions.id,
      topic: flyingKnowledgeQuestions.topic,
      subtopic: flyingKnowledgeQuestions.subtopic,
      question: flyingKnowledgeQuestions.question,
      options: flyingKnowledgeQuestions.options,
      media: flyingKnowledgeQuestions.media,
    })
    .from(flyingKnowledgeQuestions)
    .where(and(publishedIn(code, topics), notInArray(flyingKnowledgeQuestions.id, seen)))
    .orderBy(sql`random()`)
    .limit(limit);
}

export async function countUnseenFlyingKnowledgeTestQuestions(
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
    .from(flyingKnowledgeQuestions)
    .where(and(publishedIn(code, topics), notInArray(flyingKnowledgeQuestions.id, seen)));

  return Number(row?.total ?? 0);
}

export async function getFlyingKnowledgeTestQuestionsByIds(
  code: string,
  ids: string[],
): Promise<FlyingKnowledgeTestQuestion[]> {
  if (ids.length === 0) return [];
  const db = getDb();

  const rows = await db
    .select({
      id: flyingKnowledgeQuestions.id,
      topic: flyingKnowledgeQuestions.topic,
      subtopic: flyingKnowledgeQuestions.subtopic,
      question: flyingKnowledgeQuestions.question,
      options: flyingKnowledgeQuestions.options,
      media: flyingKnowledgeQuestions.media,
    })
    .from(flyingKnowledgeQuestions)
    .where(
      and(
        eq(flyingKnowledgeQuestions.subjectCode, code.toUpperCase()),
        eq(flyingKnowledgeQuestions.status, "published"),
        inArray(flyingKnowledgeQuestions.id, ids),
      ),
    );

  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row) => row !== undefined);
}

export async function getFlyingKnowledgeAnswerKey(
  code: string,
  ids: string[],
): Promise<FlyingKnowledgeAnswerKeyQuestion[]> {
  if (ids.length === 0) return [];
  const db = getDb();

  return db
    .select({
      id: flyingKnowledgeQuestions.id,
      topic: flyingKnowledgeQuestions.topic,
      subtopic: flyingKnowledgeQuestions.subtopic,
      question: flyingKnowledgeQuestions.question,
      options: flyingKnowledgeQuestions.options,
      media: flyingKnowledgeQuestions.media,
      correct: flyingKnowledgeQuestions.correct,
      explanation: flyingKnowledgeQuestions.explanation,
      reference: flyingKnowledgeQuestions.reference,
    })
    .from(flyingKnowledgeQuestions)
    .where(
      and(
        eq(flyingKnowledgeQuestions.subjectCode, code.toUpperCase()),
        eq(flyingKnowledgeQuestions.status, "published"),
        inArray(flyingKnowledgeQuestions.id, ids),
      ),
    );
}
