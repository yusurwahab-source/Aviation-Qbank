import "server-only";

import { and, asc, count, eq, inArray, notInArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { aircraft, attempts, questions } from "@/db/schema";
import type { QuestionOption } from "@/content/schema";
import type { ContentCategory } from "@/lib/content-categories";

/**
 * Every read the application performs.
 *
 * Two rules hold throughout:
 *  - queries are always scoped by aircraft code;
 *  - only `published` questions are ever returned to a user.
 */

/** A question as the browser is allowed to see it: no answer, no explanation. */
export type TestQuestion = {
  id: string;
  topic: string;
  subtopic: string | null;
  question: string;
  options: QuestionOption[];
  /** An illustration's path, if the question was authored with one. Never an
   * answer, so it crosses to the browser with everything else here. */
  media: string | null;
};

/** The full question, used server-side for grading and for the review screen. */
export type AnswerKeyQuestion = TestQuestion & {
  correct: string;
  explanation: string;
  reference: string | null;
};

export type AircraftSummary = {
  code: string;
  category: "type-rating" | "light-aircraft" | "flying-knowledge";
  name: string;
  manufacturer: string;
  variant: string | null;
  description: string;
  status: "active" | "coming_soon";
  publishedQuestions: number;
};

export type TopicSummary = {
  topic: string;
  questionCount: number;
};

/**
 * How many aircraft the bank holds, whatever their status — a true
 * platform-wide fact, independent of which ones any given page chooses to
 * feature. Deliberately not scoped to one aircraft code, unlike every other
 * query here: "how many types do you cover" is a fact about the platform,
 * not about one type's test.
 *
 * The landing page's other two headline numbers — questions and systems —
 * are deliberately *not* read here. Both come from `listTopics` for
 * whichever aircraft is being featured, so the hero's count can never drift
 * from the sum shown in the grid immediately below it.
 */
export async function countAircraft(): Promise<number> {
  const [row] = await getDb().select({ total: count() }).from(aircraft);
  return Number(row?.total ?? 0);
}

const aircraftSummaryColumns = {
  code: aircraft.code,
  category: aircraft.category,
  name: aircraft.name,
  manufacturer: aircraft.manufacturer,
  variant: aircraft.variant,
  description: aircraft.description,
  status: aircraft.status,
  publishedQuestions: sql<number>`count(${questions.id}) filter (where ${questions.status} = 'published')::int`,
};

/** Aircraft for the picker, with how many questions each one actually has. */
export async function listAircraft(category?: ContentCategory): Promise<AircraftSummary[]> {
  const db = getDb();

  return db
    .select(aircraftSummaryColumns)
    .from(aircraft)
    .leftJoin(questions, eq(questions.aircraftCode, aircraft.code))
    .where(category ? eq(aircraft.category, category) : undefined)
    .groupBy(aircraft.code)
    .orderBy(asc(aircraft.sortOrder), asc(aircraft.code));
}

export async function listAircraftByCategory(category: ContentCategory): Promise<AircraftSummary[]> {
  return listAircraft(category);
}

export async function getAircraft(code: string): Promise<AircraftSummary | null> {
  const db = getDb();

  const [row] = await db
    .select(aircraftSummaryColumns)
    .from(aircraft)
    .leftJoin(questions, eq(questions.aircraftCode, aircraft.code))
    .where(eq(aircraft.code, code.toUpperCase()))
    .groupBy(aircraft.code)
    .limit(1);

  return row ?? null;
}

/** Published question counts per topic, for the test builder. */
export async function listTopics(code: string): Promise<TopicSummary[]> {
  const rows = await getDb()
    .select({ topic: questions.topic, questionCount: count() })
    .from(questions)
    .where(
      and(eq(questions.aircraftCode, code.toUpperCase()), eq(questions.status, "published")),
    )
    .groupBy(questions.topic)
    .orderBy(asc(questions.topic));

  return rows.map((row) => ({ topic: row.topic, questionCount: Number(row.questionCount) }));
}

/**
 * The filter every user-facing question query shares: this aircraft, published
 * only, and optionally narrowed to a set of sections.
 *
 * Topics reach the database as bound parameters. An empty list means every
 * section rather than none — a link with no usable topic still gives a test.
 */
function publishedIn(code: string, topics: string[] = []) {
  return and(
    eq(questions.aircraftCode, code.toUpperCase()),
    eq(questions.status, "published"),
    ...(topics.length > 0 ? [inArray(questions.topic, topics)] : []),
  );
}

/**
 * How many questions a selection actually holds.
 *
 * The builder shows this to the student before they start, and the test page
 * uses it to turn "all questions" into a real number.
 */
export async function countTestQuestions(code: string, topics: string[] = []): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(questions)
    .where(publishedIn(code, topics));

  return Number(row?.total ?? 0);
}

/**
 * Picks a random set of published questions for a test.
 *
 * Pass `topics` to draw from one section or several. The limit is applied by
 * the database, so asking for more than exists simply returns everything that
 * does — there is no ceiling to get wrong.
 *
 * `order by random()` is fine for banks of this size. If a bank ever grows to
 * hundreds of thousands of questions this is the query to revisit.
 */
export async function pickTestQuestions(
  code: string,
  limit: number,
  topics: string[] = [],
): Promise<TestQuestion[]> {
  if (limit <= 0) return [];

  return getDb()
    .select({
      id: questions.id,
      topic: questions.topic,
      subtopic: questions.subtopic,
      question: questions.question,
      options: questions.options,
      media: questions.media,
    })
    .from(questions)
    .where(publishedIn(code, topics))
    .orderBy(sql`random()`)
    .limit(limit);
}

/**
 * Picks a random set of published questions the user has never answered —
 * the test builder's "Unseen questions" preset.
 *
 * "Never answered" rather than "not in the retry list": a question left
 * unanswered in an abandoned test still has an `attempts` row (see the note
 * on `attempts` in the schema — a row exists the moment a question is
 * *shown and skipped*, not only when it is picked), so it already counts as
 * seen here even though it was never actually graded. That is the right
 * call for what "unseen" is supposed to mean to a student browsing a bank
 * this large: a question they have already sat in front of once.
 */
export async function pickUnseenTestQuestions(
  code: string,
  userId: string,
  limit: number,
  topics: string[] = [],
): Promise<TestQuestion[]> {
  if (limit <= 0) return [];

  const seen = getDb()
    .select({ questionId: attempts.questionId })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.aircraftCode, code.toUpperCase())));

  return getDb()
    .select({
      id: questions.id,
      topic: questions.topic,
      subtopic: questions.subtopic,
      question: questions.question,
      options: questions.options,
      media: questions.media,
    })
    .from(questions)
    .where(and(publishedIn(code, topics), notInArray(questions.id, seen)))
    .orderBy(sql`random()`)
    .limit(limit);
}

/**
 * How many unseen questions a selection holds — the builder's own "N
 * available" line, the same job `countTestQuestions` does for a plain test.
 */
export async function countUnseenTestQuestions(
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
    .from(questions)
    .where(and(publishedIn(code, topics), notInArray(questions.id, seen)));

  return Number(row?.total ?? 0);
}

/**
 * Loads specific published questions by id, for a retry test.
 *
 * Sanitised exactly like `pickTestQuestions`: no answer key crosses to the
 * browser. Ids that no longer exist, are drafts, or belong to another aircraft
 * simply do not come back.
 */
export async function getTestQuestionsByIds(
  code: string,
  ids: string[],
): Promise<TestQuestion[]> {
  if (ids.length === 0) return [];
  const db = getDb();

  const rows = await db
    .select({
      id: questions.id,
      topic: questions.topic,
      subtopic: questions.subtopic,
      question: questions.question,
      options: questions.options,
      media: questions.media,
    })
    .from(questions)
    .where(
      and(
        eq(questions.aircraftCode, code.toUpperCase()),
        eq(questions.status, "published"),
        inArray(questions.id, ids),
      ),
    );

  // Keep the order the caller asked for; `in` gives no ordering guarantee.
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row) => row !== undefined);
}

/**
 * Loads the answer key for a set of question ids.
 *
 * Scoped by aircraft and by `published` as well as by id, so a tampered
 * request cannot pull back a draft question or one from another aircraft.
 */
export async function getAnswerKey(
  code: string,
  ids: string[],
): Promise<AnswerKeyQuestion[]> {
  if (ids.length === 0) return [];
  const db = getDb();

  return db
    .select({
      id: questions.id,
      topic: questions.topic,
      subtopic: questions.subtopic,
      question: questions.question,
      options: questions.options,
      media: questions.media,
      correct: questions.correct,
      explanation: questions.explanation,
      reference: questions.reference,
    })
    .from(questions)
    .where(
      and(
        eq(questions.aircraftCode, code.toUpperCase()),
        eq(questions.status, "published"),
        inArray(questions.id, ids),
      ),
    );
}
