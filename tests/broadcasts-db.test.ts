import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb } from "@/db";
import {
  claimDeliveries,
  countAudiences,
  createBroadcast,
  getBroadcast,
  markDelivery,
  requeueFailed,
} from "@/db/broadcasts";
import { broadcastDeliveries, broadcasts, subscriptions, users } from "@/db/schema";
import { findUnsubscribeToken, optOutWithToken } from "@/db/unsubscribe";
import { sendNextBatch } from "@/lib/broadcast/send-batch";
import type { EmailMessage } from "@/lib/email/send";
import { hashPassword } from "@/lib/password";

/**
 * Broadcasts against a real database: who each audience reaches, that two
 * senders never take the same row, that sending is resumable, and that an
 * unsubscribe link reaches exactly the account it was made for.
 *
 * Other tests leave their own users in the same database, so every assertion
 * here is about the accounts this file created — never a total.
 */

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

const DAY = 24 * 60 * 60 * 1000;

describeDb("broadcasts", () => {
  const db = () => getDb();
  const createdUsers: string[] = [];
  const createdBroadcasts: string[] = [];

  type Seed = { id: string; email: string };
  const seeds: Record<string, Seed> = {};

  async function makeUser(
    name: string,
    options: { verified?: boolean; optedOut?: boolean; access?: "active" | "expiring" | "expired" } = {},
  ): Promise<Seed> {
    const [row] = await db()
      .insert(users)
      .values({
        email: `bc-${name}-${randomUUID()}@example.invalid`,
        passwordHash: await hashPassword("irrelevant-password"),
        emailVerifiedAt: options.verified === false ? null : new Date(),
        broadcastOptOutAt: options.optedOut ? new Date() : null,
      })
      .returning({ id: users.id, email: users.email });
    createdUsers.push(row.id);

    if (options.access) {
      const end =
        options.access === "active"
          ? new Date(Date.now() + 90 * DAY)
          : options.access === "expiring"
            ? new Date(Date.now() + 3 * DAY)
            : new Date(Date.now() - DAY);
      await db().insert(subscriptions).values({
        userId: row.id,
        plan: "monthly",
        status: "active",
        provider: "manual",
        currentPeriodEnd: end,
      });
    }

    seeds[name] = row;
    return row;
  }

  /** Which of this file's accounts a broadcast was queued for. */
  async function recipientsOf(broadcastId: string): Promise<string[]> {
    const rows = await db()
      .select({ userId: broadcastDeliveries.userId })
      .from(broadcastDeliveries)
      .where(eq(broadcastDeliveries.broadcastId, broadcastId));
    const mine = new Set(createdUsers);
    return rows.map((row) => row.userId).filter((id) => mine.has(id));
  }

  async function queue(audience: "everyone" | "subscribers" | "free" | "expiring", onlyConfirmed: boolean) {
    const created = await createBroadcast({
      subject: "Subject",
      body: "Body",
      audience,
      onlyConfirmed,
      createdByEmail: "owner@example.invalid",
    });
    expect(created).not.toBeNull();
    createdBroadcasts.push(created!.id);
    return created!.id;
  }

  beforeAll(async () => {
    await makeUser("free");
    await makeUser("freeUnconfirmed", { verified: false });
    await makeUser("subscriber", { access: "active" });
    await makeUser("expiring", { access: "expiring" });
    await makeUser("lapsed", { access: "expired" });
    await makeUser("optedOut", { optedOut: true, access: "active" });
  });

  afterAll(async () => {
    if (createdBroadcasts.length > 0) {
      await db().delete(broadcasts).where(inArray(broadcasts.id, createdBroadcasts));
    }
    for (const id of createdUsers) await db().delete(users).where(eq(users.id, id));
  });

  it("aims 'everyone' at every account except those who unsubscribed", async () => {
    const ids = await recipientsOf(await queue("everyone", false));
    expect(ids).toContain(seeds.free.id);
    expect(ids).toContain(seeds.freeUnconfirmed.id);
    expect(ids).toContain(seeds.lapsed.id);
    expect(ids).not.toContain(seeds.optedOut.id);
  });

  it("leaves out unconfirmed addresses when asked to", async () => {
    const ids = await recipientsOf(await queue("everyone", true));
    expect(ids).toContain(seeds.free.id);
    expect(ids).not.toContain(seeds.freeUnconfirmed.id);
  });

  it("treats a subscription that has run out as no access at all", async () => {
    const subscribers = await recipientsOf(await queue("subscribers", false));
    expect(subscribers).toContain(seeds.subscriber.id);
    expect(subscribers).toContain(seeds.expiring.id);
    expect(subscribers).not.toContain(seeds.lapsed.id);
    expect(subscribers).not.toContain(seeds.optedOut.id);

    const free = await recipientsOf(await queue("free", false));
    expect(free).toContain(seeds.free.id);
    expect(free).toContain(seeds.lapsed.id);
    expect(free).not.toContain(seeds.subscriber.id);
  });

  it("finds only the accounts whose access ends soon", async () => {
    const ids = await recipientsOf(await queue("expiring", false));
    expect(ids).toEqual([seeds.expiring.id]);
  });

  it("reports counts for every audience, with and without the confirmed restriction", async () => {
    const counts = await countAudiences();
    expect(counts.everyone.all).toBeGreaterThanOrEqual(counts.everyone.confirmed);
    expect(counts.everyone.all).toBeGreaterThanOrEqual(5);
    expect(counts.expiring.all).toBeGreaterThanOrEqual(1);
  });

  it("refuses to record a broadcast nobody would receive", async () => {
    // Everyone this file created is either not expiring or opted out, but other
    // tests' accounts could be expiring — so aim at an empty set directly.
    await db().update(users).set({ broadcastOptOutAt: new Date() }).where(eq(users.id, seeds.expiring.id));
    const counts = await countAudiences();
    if (counts.expiring.all === 0) {
      expect(
        await createBroadcast({
          subject: "s",
          body: "b",
          audience: "expiring",
          onlyConfirmed: false,
          createdByEmail: "owner@example.invalid",
        }),
      ).toBeNull();
    }
    await db().update(users).set({ broadcastOptOutAt: null }).where(eq(users.id, seeds.expiring.id));
  });

  it("fixes the recipient list when the broadcast is made", async () => {
    const id = await queue("subscribers", false);
    const before = await recipientsOf(id);

    await db().update(subscriptions).set({ status: "canceled" }).where(eq(subscriptions.userId, seeds.subscriber.id));
    expect(await recipientsOf(id)).toEqual(before);
    await db().update(subscriptions).set({ status: "active" }).where(eq(subscriptions.userId, seeds.subscriber.id));
  });

  it("never hands the same delivery to two senders", async () => {
    const id = await queue("everyone", false);
    const total = (await getBroadcast(id))!.counts.queued;

    const [first, second] = await Promise.all([claimDeliveries(id, total), claimDeliveries(id, total)]);
    const firstIds = new Set(first.map((delivery) => delivery.id));

    expect(first.length + second.length).toBe(total);
    expect(second.every((delivery) => !firstIds.has(delivery.id))).toBe(true);
  });

  it("gives a stale claim to the next sender", async () => {
    const id = await queue("free", false);
    const [claimed] = await claimDeliveries(id, 1);

    expect((await claimDeliveries(id, 1000)).some((delivery) => delivery.id === claimed.id)).toBe(false);

    await db()
      .update(broadcastDeliveries)
      .set({ claimedAt: new Date(Date.now() - 10 * 60 * 1000) })
      .where(eq(broadcastDeliveries.id, claimed.id));

    expect((await claimDeliveries(id, 1000)).some((delivery) => delivery.id === claimed.id)).toBe(true);
  });

  describe("sending", () => {
    const configured = () => true;

    it("sends every delivery once, with a working unsubscribe link in each", async () => {
      const id = await queue("everyone", false);
      const sentTo: EmailMessage[] = [];

      let remaining = Infinity;
      while (remaining > 0) {
        const result = await sendNextBatch(id, {
          configured,
          spacingMs: 0,
          send: async (message) => {
            sentTo.push(message);
            return { delivered: true, via: "resend" };
          },
        });
        if ("error" in result) throw new Error(result.error);
        remaining = result.remaining;
      }

      const detail = (await getBroadcast(id))!;
      expect(detail.counts.queued + detail.counts.sending + detail.counts.failed).toBe(0);
      expect(detail.counts.sent).toBe(sentTo.length);

      const mine = sentTo.find((message) => message.to === seeds.free.email)!;
      expect(mine.text).toContain("/unsubscribe?token=");
      expect(mine.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");

      // The link in that one email belongs to that one account.
      const token = decodeURIComponent(mine.text.match(/unsubscribe\?token=([^\s]+)/)![1]);
      expect(await findUnsubscribeToken(token)).toMatchObject({ userId: seeds.free.id, alreadyOptedOut: false });
    });

    it("records a failure, and sends it again once requeued", async () => {
      const id = await queue("free", false);

      const failing = async () => ({ delivered: false, via: "resend" as const, error: "429" });
      let result = await sendNextBatch(id, { configured, spacingMs: 0, send: failing });
      while (!("error" in result) && result.remaining > 0) {
        result = await sendNextBatch(id, { configured, spacingMs: 0, send: failing });
      }

      const failedRun = (await getBroadcast(id))!;
      expect(failedRun.counts.sent).toBe(0);
      expect(failedRun.counts.failed).toBeGreaterThan(0);
      expect(failedRun.failures[0].error).toBe("429");

      const requeued = await requeueFailed(id);
      expect(requeued).toBe(failedRun.counts.failed);

      let remaining = Infinity;
      while (remaining > 0) {
        const next = await sendNextBatch(id, {
          configured,
          spacingMs: 0,
          send: async () => ({ delivered: true, via: "resend" }),
        });
        if ("error" in next) throw new Error(next.error);
        remaining = next.remaining;
      }
      expect((await getBroadcast(id))!.counts.failed).toBe(0);
    });

    it("refuses to send when no mail provider is configured", async () => {
      const id = await queue("free", false);
      const result = await sendNextBatch(id, { configured: () => false, spacingMs: 0 });
      expect(result).toEqual({ error: "No mail provider is configured, so nothing can be sent." });
      expect((await getBroadcast(id))!.counts.sent).toBe(0);
    });

    it("keeps a delivery that threw from blocking the others", async () => {
      const id = await queue("free", false);
      let calls = 0;
      const result = await sendNextBatch(id, {
        configured,
        spacingMs: 0,
        send: async () => {
          calls += 1;
          if (calls === 1) throw new Error("boom");
          return { delivered: true, via: "resend" };
        },
      });
      if ("error" in result) throw new Error(result.error);
      expect(result.failed).toBe(1);
      expect(result.sent).toBeGreaterThanOrEqual(0);
    });

    it("stores only the hash of the unsubscribe token", async () => {
      const id = await queue("free", false);
      let message!: EmailMessage;
      await sendNextBatch(id, {
        configured,
        spacingMs: 0,
        send: async (sent) => {
          message = message ?? sent;
          return { delivered: true, via: "resend" };
        },
      });

      const token = decodeURIComponent(message.text.match(/unsubscribe\?token=([^\s]+)/)![1]);
      const rows = await db()
        .select({ hash: broadcastDeliveries.unsubscribeTokenHash })
        .from(broadcastDeliveries)
        .where(eq(broadcastDeliveries.broadcastId, id));

      expect(rows.some((row) => row.hash === token)).toBe(false);
      expect(rows.some((row) => row.hash && row.hash.length === 64)).toBe(true);
    });
  });

  it("opts an account out with its token, and leaves it out of later broadcasts", async () => {
    const victim = await makeUser("victim");
    const id = await queue("everyone", false);
    expect(await recipientsOf(id)).toContain(victim.id);

    let token = "";
    await sendNextBatchFor(id, victim.email, (message) => {
      token = decodeURIComponent(message.text.match(/unsubscribe\?token=([^\s]+)/)![1]);
    });

    expect(await optOutWithToken(token)).toBe(true);
    expect(await optOutWithToken("not-a-token")).toBe(false);

    const later = await recipientsOf(await queue("everyone", false));
    expect(later).not.toContain(victim.id);
    expect(later).toContain(seeds.free.id);
  });

  async function sendNextBatchFor(id: string, email: string, capture: (message: EmailMessage) => void) {
    let remaining = Infinity;
    while (remaining > 0) {
      const result = await sendNextBatch(id, {
        configured: () => true,
        spacingMs: 0,
        send: async (message) => {
          if (message.to === email) capture(message);
          return { delivered: true, via: "resend" };
        },
      });
      if ("error" in result) throw new Error(result.error);
      remaining = result.remaining;
    }
  }

  it("marks a delivery sent or failed exactly as told", async () => {
    const id = await queue("free", false);
    const [delivery] = await claimDeliveries(id, 1);
    await markDelivery(delivery.id, { sent: false, error: "x".repeat(500) });

    const [row] = await db().select().from(broadcastDeliveries).where(eq(broadcastDeliveries.id, delivery.id));
    expect(row.status).toBe("failed");
    expect(row.error).toHaveLength(200);
  });
});
