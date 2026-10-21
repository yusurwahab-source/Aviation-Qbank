import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { flyingKnowledgeQuestions, flyingKnowledgeSubjects, instagramPosts } from "@/db/schema";
import { fitsCard, type CardQuestion, type PostKind } from "@/lib/instagram/plan";

/**
 * Reads and writes for the Instagram agent.
 *
 * Takes no `userId`: this is the site's own account. Only the cron route and
 * the signed card route call it. Questions come from Flying Knowledge alone —
 * see `lib/instagram/plan.ts` for why no other bank is ever read here.
 */

const PICK_ATTEMPTS = 40;

/**
 * Today's question: published, active subject, not used by an earlier post,
 * and small enough to fit a card. The order is a hash of the id and the day,
 * so the same day always picks the same question (a retry never changes it)
 * and different days spread across the whole bank rather than walking it.
 */
export async function pickQuestionForDay(
  day: string,
): Promise<(CardQuestion & { subjectCode: string }) | null> {
  const used = await getDb()
    .select({ ref: instagramPosts.contentRef })
    .from(instagramPosts)
    .where(inArray(instagramPosts.kind, ["question", "tip"]));
  const usedIds = used.map((row) => row.ref);

  const rows = await getDb()
    .select({
      id: flyingKnowledgeQuestions.id,
      subjectCode: flyingKnowledgeQuestions.subjectCode,
      subjectName: flyingKnowledgeSubjects.name,
      topic: flyingKnowledgeQuestions.topic,
      question: flyingKnowledgeQuestions.question,
      options: flyingKnowledgeQuestions.options,
      correct: flyingKnowledgeQuestions.correct,
      explanation: flyingKnowledgeQuestions.explanation,
    })
    .from(flyingKnowledgeQuestions)
    .innerJoin(
      flyingKnowledgeSubjects,
      eq(flyingKnowledgeSubjects.code, flyingKnowledgeQuestions.subjectCode),
    )
    .where(
      and(
        eq(flyingKnowledgeQuestions.status, "published"),
        eq(flyingKnowledgeSubjects.status, "active"),
        usedIds.length > 0
          ? sql`${flyingKnowledgeQuestions.id} not in (${sql.join(
              usedIds.map((id) => sql`${id}`),
              sql`, `,
            )})`
          : undefined,
      ),
    )
    .orderBy(sql`md5(${flyingKnowledgeQuestions.id} || ${day})`)
    .limit(PICK_ATTEMPTS);

  return rows.find((row) => fitsCard(row)) ?? null;
}

/** One published question by id, for the card route. `null` for anything else. */
export async function getCardQuestion(id: string): Promise<(CardQuestion & { subjectCode: string }) | null> {
  const [row] = await getDb()
    .select({
      id: flyingKnowledgeQuestions.id,
      subjectCode: flyingKnowledgeQuestions.subjectCode,
      subjectName: flyingKnowledgeSubjects.name,
      topic: flyingKnowledgeQuestions.topic,
      question: flyingKnowledgeQuestions.question,
      options: flyingKnowledgeQuestions.options,
      correct: flyingKnowledgeQuestions.correct,
      explanation: flyingKnowledgeQuestions.explanation,
    })
    .from(flyingKnowledgeQuestions)
    .innerJoin(
      flyingKnowledgeSubjects,
      eq(flyingKnowledgeSubjects.code, flyingKnowledgeQuestions.subjectCode),
    )
    .where(
      and(eq(flyingKnowledgeQuestions.id, id), eq(flyingKnowledgeQuestions.status, "published")),
    )
    .limit(1);

  return row ?? null;
}

export type ClaimInput = { postedOn: string; kind: PostKind; contentRef: string };

/**
 * Reserves the day. Returns the row's id when this caller may publish, `null`
 * when the day is already taken (posted, in flight, or claimed by a racing
 * caller). A `failed` row is revived, which is the manual retry.
 */
export async function claimDay(input: ClaimInput): Promise<string | null> {
  const [row] = await getDb()
    .insert(instagramPosts)
    .values({ ...input, status: "pending" })
    .onConflictDoUpdate({
      target: instagramPosts.postedOn,
      set: {
        kind: input.kind,
        contentRef: input.contentRef,
        status: "pending",
        error: null,
        updatedAt: sql`now()`,
      },
      setWhere: eq(instagramPosts.status, "failed"),
    })
    .returning({ id: instagramPosts.id });

  return row?.id ?? null;
}

export async function markPosted(
  id: string,
  result: { mediaId: string; permalink: string | null; caption: string },
): Promise<void> {
  await getDb()
    .update(instagramPosts)
    .set({ status: "posted", ...result, updatedAt: sql`now()` })
    .where(eq(instagramPosts.id, id));
}

export async function markFailed(id: string, error: string): Promise<void> {
  await getDb()
    .update(instagramPosts)
    .set({ status: "failed", error: error.slice(0, 500), updatedAt: sql`now()` })
    .where(eq(instagramPosts.id, id));
}

export async function getDayRow(postedOn: string) {
  const [row] = await getDb()
    .select()
    .from(instagramPosts)
    .where(eq(instagramPosts.postedOn, postedOn))
    .limit(1);
  return row ?? null;
}

export async function recentPosts(limit = 30) {
  return getDb().select().from(instagramPosts).orderBy(desc(instagramPosts.createdAt)).limit(limit);
}
