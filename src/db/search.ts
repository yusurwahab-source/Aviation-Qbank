import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { questions } from "@/db/schema";

/**
 * Keyword search across every published question — the stem, its options
 * and its explanation, via `questions.search_vector` (see the note on that
 * column in `schema.ts`). Backed by the `questions_search_vector_idx` GIN
 * index, so this is a single index scan regardless of how large the bank
 * grows, not a table scan with a `like` on three columns.
 */

export type SearchResult = {
  id: string;
  aircraftCode: string;
  topic: string;
  question: string;
};

/** More than enough to browse; a search screen showing hundreds of exact
 * matches would not be more useful than one showing the best 30. */
const MAX_SEARCH_RESULTS = 30;

export async function searchQuestions(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const rows = await getDb()
    .select({
      id: questions.id,
      aircraftCode: questions.aircraftCode,
      topic: questions.topic,
      question: questions.question,
      rank: sql<number>`ts_rank(${questions.searchVector}, plainto_tsquery('english', ${trimmed}))`.as(
        "rank",
      ),
    })
    .from(questions)
    .where(
      and(
        eq(questions.status, "published"),
        sql`${questions.searchVector} @@ plainto_tsquery('english', ${trimmed})`,
      ),
    )
    .orderBy(desc(sql`rank`))
    .limit(MAX_SEARCH_RESULTS);

  return rows.map((row) => ({
    id: row.id,
    aircraftCode: row.aircraftCode,
    topic: row.topic,
    question: row.question,
  }));
}
