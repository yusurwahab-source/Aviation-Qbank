import "server-only";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { EXPIRING_SOON_DAYS } from "@/db/owner";
import { broadcastDeliveries, broadcasts, subscriptions, users } from "@/db/schema";
import { AUDIENCES, type Audience } from "@/lib/broadcast/audience";

/**
 * Broadcasts: composing who gets one, queueing it, and working through the
 * queue.
 *
 * Like `db/owner.ts`, this module reads every user and takes no `userId`, and
 * that is deliberate and dangerous in the same way: the whole guard is that
 * every caller sits under `/owner` behind `requireOwner()`. Nothing outside
 * that area may import it. The public half — an unsubscribe link — lives in
 * `db/unsubscribe.ts`, scoped to one token, precisely so it never needs this.
 */

/** A delivery claimed this long ago and never finished is given up on and
 * claimed again — the sender that took it died, or its tab closed. */
const STALE_CLAIM_MINUTES = 5;

/**
 * The accounts an audience means, as a SQL condition on a query that selects
 * from `users` left-joined to `subscriptions`.
 *
 * "Active" is the same two-column check `hasActiveSubscription` and the
 * accounts screen use (`status = 'active' and current_period_end > now()`),
 * never `status` alone. Anybody who has unsubscribed is excluded from every
 * audience, always, with no option to include them.
 */
function audienceCondition(audience: Audience, onlyConfirmed: boolean) {
  const active = sql`${subscriptions.status} = 'active' and ${subscriptions.currentPeriodEnd} > now()`;

  const byAudience = (() => {
    switch (audience) {
      case "everyone":
        return undefined;
      case "subscribers":
        return active;
      case "free":
        return sql`not coalesce(${subscriptions.status} = 'active' and ${subscriptions.currentPeriodEnd} > now(), false)`;
      case "expiring":
        return sql`${active} and ${subscriptions.currentPeriodEnd} <= now() + interval '${sql.raw(String(EXPIRING_SOON_DAYS))} days'`;
    }
  })();

  return and(
    isNull(users.broadcastOptOutAt),
    onlyConfirmed ? sql`${users.emailVerifiedAt} is not null` : undefined,
    byAudience,
  );
}

export type AudienceCounts = Record<Audience, { confirmed: number; all: number }>;

/**
 * How many accounts each audience would reach, with and without the
 * "confirmed addresses only" restriction — every figure the composer's button
 * can show, in one query, so the button never promises more than a send
 * delivers.
 */
export async function countAudiences(): Promise<AudienceCounts> {
  const db = getDb();

  const entries = await Promise.all(
    AUDIENCES.flatMap((audience) =>
      [true, false].map(async (onlyConfirmed) => {
        const [row] = await db
          .select({ total: sql<number>`count(*)::int` })
          .from(users)
          .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
          .where(audienceCondition(audience, onlyConfirmed));
        return { audience, onlyConfirmed, total: row?.total ?? 0 };
      }),
    ),
  );

  const counts = Object.fromEntries(
    AUDIENCES.map((audience) => [audience, { confirmed: 0, all: 0 }]),
  ) as AudienceCounts;
  for (const entry of entries) {
    counts[entry.audience][entry.onlyConfirmed ? "confirmed" : "all"] = entry.total;
  }
  return counts;
}

/**
 * Records a broadcast and fixes its recipient list, in one transaction.
 *
 * The list is taken now and never recomputed: a message is written to the
 * people it was aimed at when it was sent, and the log of who that was
 * cannot shift underneath it. Returns null for an audience with nobody in it,
 * so an empty send is refused rather than recorded.
 */
export async function createBroadcast(input: {
  subject: string;
  body: string;
  audience: Audience;
  onlyConfirmed: boolean;
  createdByEmail: string;
}): Promise<{ id: string; recipients: number } | null> {
  return getDb().transaction(async (tx) => {
    const recipients = await tx
      .select({ id: users.id, email: users.email })
      .from(users)
      .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
      .where(audienceCondition(input.audience, input.onlyConfirmed));

    if (recipients.length === 0) return null;

    const [broadcast] = await tx
      .insert(broadcasts)
      .values({
        subject: input.subject,
        body: input.body,
        audience: input.audience,
        onlyConfirmed: input.onlyConfirmed,
        createdByEmail: input.createdByEmail,
      })
      .returning({ id: broadcasts.id });

    // In chunks: one statement carries a bounded number of bind parameters.
    for (let start = 0; start < recipients.length; start += 1000) {
      await tx.insert(broadcastDeliveries).values(
        recipients.slice(start, start + 1000).map((recipient) => ({
          broadcastId: broadcast.id,
          userId: recipient.id,
          email: recipient.email,
        })),
      );
    }

    return { id: broadcast.id, recipients: recipients.length };
  });
}

export type ClaimedDelivery = { id: string; userId: string; email: string };

/**
 * Takes up to `limit` unsent deliveries for a sender to work on.
 *
 * `for update skip locked` is what makes two senders — two tabs, a retry
 * while the first is still going — safe: each row goes to exactly one of
 * them. A row left `sending` by a sender that never finished becomes
 * claimable again after `STALE_CLAIM_MINUTES`.
 */
export async function claimDeliveries(broadcastId: string, limit: number): Promise<ClaimedDelivery[]> {
  const result = await getDb().execute<{ id: string; user_id: string; email: string }>(sql`
    update ${broadcastDeliveries}
       set status = 'sending', claimed_at = now()
     where id in (
       select id from ${broadcastDeliveries}
        where broadcast_id = ${broadcastId}
          and (
            status = 'queued'
            or (status = 'sending'
                and claimed_at < now() - interval '${sql.raw(String(STALE_CLAIM_MINUTES))} minutes')
          )
        order by created_at, id
        limit ${limit}
        for update skip locked
     )
    returning id, user_id, email
  `);

  return result.rows.map((row) => ({ id: row.id, userId: row.user_id, email: row.email }));
}

/** Stores the hash of the unsubscribe token about to go out in one email. */
export async function setDeliveryToken(deliveryId: string, tokenHash: string): Promise<void> {
  await getDb()
    .update(broadcastDeliveries)
    .set({ unsubscribeTokenHash: tokenHash })
    .where(eq(broadcastDeliveries.id, deliveryId));
}

export async function markDelivery(
  deliveryId: string,
  outcome: { sent: true } | { sent: false; error: string },
): Promise<void> {
  await getDb()
    .update(broadcastDeliveries)
    .set(
      outcome.sent
        ? { status: "sent", sentAt: new Date(), error: null }
        : { status: "failed", error: outcome.error.slice(0, 200) },
    )
    .where(eq(broadcastDeliveries.id, deliveryId));
}

/** Puts every failed delivery of a broadcast back in the queue. */
export async function requeueFailed(broadcastId: string): Promise<number> {
  const rows = await getDb()
    .update(broadcastDeliveries)
    .set({ status: "queued", error: null, claimedAt: null })
    .where(and(eq(broadcastDeliveries.broadcastId, broadcastId), eq(broadcastDeliveries.status, "failed")))
    .returning({ id: broadcastDeliveries.id });
  return rows.length;
}

export type DeliveryCounts = { queued: number; sending: number; sent: number; failed: number };

export type BroadcastSummary = {
  id: string;
  subject: string;
  audience: string;
  onlyConfirmed: boolean;
  createdByEmail: string;
  createdAt: Date;
  counts: DeliveryCounts;
};

function emptyCounts(): DeliveryCounts {
  return { queued: 0, sending: 0, sent: 0, failed: 0 };
}

async function countsFor(ids: string[]): Promise<Map<string, DeliveryCounts>> {
  const map = new Map<string, DeliveryCounts>();
  if (ids.length === 0) return map;

  const rows = await getDb()
    .select({
      broadcastId: broadcastDeliveries.broadcastId,
      status: broadcastDeliveries.status,
      total: sql<number>`count(*)::int`,
    })
    .from(broadcastDeliveries)
    .where(inArray(broadcastDeliveries.broadcastId, ids))
    .groupBy(broadcastDeliveries.broadcastId, broadcastDeliveries.status);

  for (const row of rows) {
    const counts = map.get(row.broadcastId) ?? emptyCounts();
    if (row.status in counts) counts[row.status as keyof DeliveryCounts] = row.total;
    map.set(row.broadcastId, counts);
  }
  return map;
}

export async function listBroadcasts(limit = 50): Promise<BroadcastSummary[]> {
  const rows = await getDb()
    .select({
      id: broadcasts.id,
      subject: broadcasts.subject,
      audience: broadcasts.audience,
      onlyConfirmed: broadcasts.onlyConfirmed,
      createdByEmail: broadcasts.createdByEmail,
      createdAt: broadcasts.createdAt,
    })
    .from(broadcasts)
    .orderBy(desc(broadcasts.createdAt))
    .limit(limit);

  const counts = await countsFor(rows.map((row) => row.id));
  return rows.map((row) => ({ ...row, counts: counts.get(row.id) ?? emptyCounts() }));
}

export type BroadcastDetail = BroadcastSummary & {
  body: string;
  failures: { email: string; error: string | null }[];
};

export async function getBroadcast(id: string): Promise<BroadcastDetail | null> {
  const db = getDb();
  const [row] = await db.select().from(broadcasts).where(eq(broadcasts.id, id)).limit(1);
  if (!row) return null;

  const [counts, failures] = await Promise.all([
    countsFor([id]),
    db
      .select({ email: broadcastDeliveries.email, error: broadcastDeliveries.error })
      .from(broadcastDeliveries)
      .where(and(eq(broadcastDeliveries.broadcastId, id), eq(broadcastDeliveries.status, "failed")))
      .orderBy(broadcastDeliveries.email)
      .limit(50),
  ]);

  return { ...row, counts: counts.get(id) ?? emptyCounts(), failures };
}
