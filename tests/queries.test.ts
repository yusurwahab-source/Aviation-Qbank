import { drizzle } from "drizzle-orm/node-postgres";
import { and, asc, eq, sql } from "drizzle-orm";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { questions } from "@/db/schema";

/**
 * Integration tests for the question queries.
 *
 * These decide what a student actually sits — how many questions, from which
 * sections — and they are SQL, so they run against a real Postgres. They skip
 * when DATABASE_URL is unset; CI provides one.
 *
 * Everything is derived from whatever content is loaded rather than hard-coded,
 * because the bank changes every time a question file is edited.
 */

const connectionString = process.env.DATABASE_URL;
const describeWithDb = connectionString ? describe : describe.skip;

describeWithDb("test question queries", () => {
  let pool: Pool;
  let queries: typeof import("@/db/queries");

  /** An aircraft that really has published questions across several topics. */
  let code: string;
  let published: number;
  let byTopic: { topic: string; questionCount: number }[];

  beforeAll(async () => {
    pool = new Pool({ connectionString, max: 1 });
    const db = drizzle(pool);
    queries = await import("@/db/queries");

    const rows = await db
      .select({
        aircraftCode: questions.aircraftCode,
        topic: questions.topic,
        questionCount: sql<number>`count(*)::int`,
      })
      .from(questions)
      .where(eq(questions.status, "published"))
      .groupBy(questions.aircraftCode, questions.topic);

    const first = rows[0];
    expect(first, "no published questions are loaded; run `npm run db:seed`").toBeDefined();

    code = first.aircraftCode;
    byTopic = rows
      .filter((row) => row.aircraftCode === code)
      .map((row) => ({ topic: row.topic, questionCount: Number(row.questionCount) }));
    published = byTopic.reduce((total, row) => total + row.questionCount, 0);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("countTestQuestions", () => {
    it("counts the whole published bank when no section is named", async () => {
      expect(await queries.countTestQuestions(code)).toBe(published);
    });

    it("counts one section", async () => {
      const section = byTopic[0];
      expect(await queries.countTestQuestions(code, [section.topic])).toBe(section.questionCount);
    });

    it("adds sections together", async () => {
      if (byTopic.length < 2) return;
      const [a, b] = byTopic;
      expect(await queries.countTestQuestions(code, [a.topic, b.topic])).toBe(
        a.questionCount + b.questionCount,
      );
    });

    it("counts nothing for a section that does not exist", async () => {
      expect(await queries.countTestQuestions(code, ["No Such Section"])).toBe(0);
    });

    it("excludes drafts", async () => {
      const db = drizzle(pool);
      const [row] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(questions)
        .where(eq(questions.aircraftCode, code));

      // Only meaningful while some content is drafted, which it is today.
      expect(await queries.countTestQuestions(code)).toBeLessThanOrEqual(Number(row.total));
    });
  });

  describe("pickTestQuestions", () => {
    // Every limit below is derived from the bank rather than written as a
    // number. A literal here does not stay correct: `100` was fine until one
    // aircraft's two largest sections held more than that between them, at
    // which point this test failed on the limit rather than on the behaviour
    // it is about.
    it("draws only from the sections asked for", async () => {
      if (byTopic.length < 2) return;
      const wanted = [byTopic[0].topic, byTopic[1].topic];
      const picked = await queries.pickTestQuestions(code, published, wanted);

      expect(picked.length).toBe(byTopic[0].questionCount + byTopic[1].questionCount);
      expect(picked.every((question) => wanted.includes(question.topic))).toBe(true);
    });

    it("treats no section as every section", async () => {
      const picked = await queries.pickTestQuestions(code, published + 1);
      expect(picked).toHaveLength(published);
    });

    it("returns everything there is rather than failing on an over-large request", async () => {
      const section = byTopic[0];
      const picked = await queries.pickTestQuestions(code, published + 1, [section.topic]);
      expect(picked).toHaveLength(section.questionCount);
    });

    it("returns nothing for a limit of zero, without touching the database", async () => {
      expect(await queries.pickTestQuestions(code, 0)).toEqual([]);
    });

    it("never returns a draft question", async () => {
      const db = drizzle(pool);
      const drafts = await db
        .select({ id: questions.id })
        .from(questions)
        .where(and(eq(questions.aircraftCode, code), eq(questions.status, "draft")));

      const picked = await queries.pickTestQuestions(code, published + 1);
      const draftIds = new Set(drafts.map((row) => row.id));
      expect(picked.some((question) => draftIds.has(question.id))).toBe(false);
    });

    it("never selects the answer key", async () => {
      // The one property that must not regress: `correct` and `explanation`
      // reach the browser only in reply to a question actually being answered.
      const [question] = await queries.pickTestQuestions(code, 1);
      expect(question).toBeDefined();
      expect(Object.keys(question)).toEqual([
        "id",
        "topic",
        "subtopic",
        "question",
        "options",
        "difficulty",
      ]);
    });
  });

  describe("getTestQuestionsByIds", () => {
    /**
     * The other way questions reach the browser: a retry test, and a resumed
     * one. It has to hold exactly the same line as `pickTestQuestions` — it
     * feeds the same screen.
     */
    it("never selects the answer key either", async () => {
      const [first] = await queries.pickTestQuestions(code, 1);
      const [question] = await queries.getTestQuestionsByIds(code, [first.id]);

      expect(question).toBeDefined();
      expect(Object.keys(question)).toEqual([
        "id",
        "topic",
        "subtopic",
        "question",
        "options",
        "difficulty",
      ]);
    });

    it("returns the questions in the order asked for", async () => {
      const picked = await queries.pickTestQuestions(code, 5);
      if (picked.length < 2) return;

      const wanted = picked.map((q) => q.id);
      const got = await queries.getTestQuestionsByIds(code, wanted);
      expect(got.map((q) => q.id)).toEqual(wanted);

      // And reversed, to prove it is the caller's order and not the table's.
      const reversed = [...wanted].reverse();
      const gotReversed = await queries.getTestQuestionsByIds(code, reversed);
      expect(gotReversed.map((q) => q.id)).toEqual(reversed);
    });

    it("drops ids that are drafts, missing, or another aircraft's", async () => {
      const db = drizzle(pool);
      const [draft] = await db
        .select({ id: questions.id })
        .from(questions)
        .where(and(eq(questions.aircraftCode, code), eq(questions.status, "draft")))
        .limit(1);

      const [real] = await queries.pickTestQuestions(code, 1);
      const asked = [real.id, "NOSUCH-QUES-0001", ...(draft ? [draft.id] : [])];

      const got = await queries.getTestQuestionsByIds(code, asked);
      expect(got.map((q) => q.id)).toEqual([real.id]);
    });

    it("returns nothing for an empty list, without touching the database", async () => {
      expect(await queries.getTestQuestionsByIds(code, [])).toEqual([]);
    });
  });

  describe("listTopics", () => {
    /**
     * These are two separate claims, and they are asserted separately on
     * purpose. Sorting the expectation in JavaScript and comparing it to a
     * Postgres `order by` conflates them, and the two disagree: Postgres sorts
     * by the database's collation, in which `en_US.utf8` ignores a space at the
     * first level, so "Airplane General" precedes "Air Systems" — while
     * JavaScript's `localeCompare` puts "Air Systems" first. A bank whose
     * section names contain no spaces never notices; this one does.
     */
    const byName = (a: { topic: string }, b: { topic: string }) =>
      a.topic < b.topic ? -1 : a.topic > b.topic ? 1 : 0;

    it("reports each section with its published count", async () => {
      const topics = await queries.listTopics(code);
      // Contents only: both sides sorted the same way, in one language.
      expect([...topics].sort(byName)).toEqual([...byTopic].sort(byName));
    });

    it("orders the sections the way the database does", async () => {
      const db = drizzle(pool);
      const rows = await db
        .select({ topic: questions.topic })
        .from(questions)
        .where(and(eq(questions.aircraftCode, code), eq(questions.status, "published")))
        .groupBy(questions.topic)
        .orderBy(asc(questions.topic));

      const topics = await queries.listTopics(code);
      expect(topics.map((row) => row.topic)).toEqual(rows.map((row) => row.topic));
    });
  });
});
