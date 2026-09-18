import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { attempts, subscriptions } from "@/db/schema";
import type { SubscriptionRow } from "@/db/schema";

/**
 * Paid access.
 *
 * `subscriptions` holds one row per user, kept current by the Stripe
 * webhook rather than read from anywhere content-shaped — see the note on the
 * table in `schema.ts`. The free tier needs no table of its own: how many
 * questions a user has used is counted straight from `attempts`, the same
 * source every report already reads, so a question answered once always
 * counts once no matter how many tests it was seen in.
 */

/** The signed-in user's current subscription row, or null if they never had one. */
export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const [row] = await getDb()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return row ?? null;
}

/**
 * How many distinct questions this user has ever answered for this aircraft.
 *
 * Distinct, not a count of attempts: revisiting a question already seen
 * (retrying it, or resuming a test) costs nothing further against the free
 * allowance — only a question that has never counted before does.
 */
export async function countQuestionsAnswered(
  userId: string,
  aircraftCode: string,
): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(distinct ${attempts.questionId})::int` })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.aircraftCode, aircraftCode)));
  return row?.count ?? 0;
}

/**
 * Whether this exact question has already counted against the user's free
 * allowance for this aircraft — i.e. whether an attempt row for it already
 * exists. Answering it again must not consume a second slot.
 */
export async function hasAnsweredQuestionBefore(
  userId: string,
  questionId: string,
): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: attempts.id })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.questionId, questionId)))
    .limit(1);
  return row !== undefined;
}

/**
 * Applies one Stripe webhook event to this user's subscription row.
 *
 * An upsert, not an insert: a renewal, a plan change and a cancellation are
 * all the same user's row moving to a new state, never a second row. The
 * caller has already verified the event's signature — this function trusts
 * its input the way `saveAnswer` trusts a caller that has already checked
 * the answer key.
 */
export async function upsertSubscription(input: {
  userId: string;
  plan: "monthly" | "quarterly";
  status: "active" | "canceled" | "expired";
  /** Which payment provider this row now reflects — passed explicitly
   * rather than left to the column's default, so a webhook can never
   * silently write the wrong provider's name. */
  provider: string;
  providerSubscriptionRef: string | null;
  currentPeriodEnd: Date | null;
}): Promise<void> {
  await getDb()
    .insert(subscriptions)
    .values({
      userId: input.userId,
      plan: input.plan,
      status: input.status,
      provider: input.provider,
      providerSubscriptionRef: input.providerSubscriptionRef,
      currentPeriodEnd: input.currentPeriodEnd,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        plan: input.plan,
        status: input.status,
        provider: input.provider,
        providerSubscriptionRef: input.providerSubscriptionRef,
        currentPeriodEnd: input.currentPeriodEnd,
        updatedAt: sql`now()`,
      },
    });
}

/**
 * Looks a subscription up by Stripe's own subscription id rather than by user.
 *
 * A cancellation raised from Stripe's customer portal, rather than through
 * our own checkout, still carries the subscription's id but may not carry
 * the `userId`/`plan` metadata set at checkout — this is how that event
 * still finds the right row.
 */
export async function findSubscriptionByProviderRef(
  providerSubscriptionRef: string,
): Promise<SubscriptionRow | null> {
  const [row] = await getDb()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.providerSubscriptionRef, providerSubscriptionRef))
    .limit(1);
  return row ?? null;
}
