import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/db";
import { grantAccess, listAccounts, revokeAccess } from "@/db/owner";
import { subscriptions, users } from "@/db/schema";
import { hasActiveSubscription } from "@/lib/billing/access-policy";
import { hashPassword } from "@/lib/password";

/**
 * The owner's two writes, against a real database.
 *
 * What matters here is not that an update runs — it is that granting is
 * *extension*, never replacement. An owner handing somebody thirty days
 * must not be able to take ninety away by accident, and that property lives
 * in the transaction rather than in any pure function, so it is asserted
 * against real rows.
 */

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("owner account access", () => {
  const createdUsers: string[] = [];

  async function makeUser(): Promise<{ id: string; email: string }> {
    const email = `owner-acct-${randomUUID()}@example.invalid`;
    const [row] = await getDb()
      .insert(users)
      .values({ email, passwordHash: await hashPassword("the-original-password") })
      .returning({ id: users.id });
    createdUsers.push(row.id);
    return { id: row.id, email };
  }

  async function readSubscription(userId: string) {
    const [row] = await getDb()
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    return row ?? null;
  }

  afterAll(async () => {
    for (const id of createdUsers) {
      await getDb().delete(users).where(eq(users.id, id));
    }
  });

  it("grants access to an account that never subscribed", async () => {
    const user = await makeUser();

    const granted = await grantAccess({ userId: user.id, plan: "monthly", days: 30 });
    expect(granted?.email).toBe(user.email);

    const row = await readSubscription(user.id);
    expect(row?.provider).toBe("manual");
    expect(hasActiveSubscription(row)).toBe(true);
  });

  it("extends existing access rather than replacing it", async () => {
    const user = await makeUser();

    const long = await grantAccess({ userId: user.id, plan: "quarterly", days: 90 });
    const short = await grantAccess({ userId: user.id, plan: "monthly", days: 1 });

    // A one-day grant on top of ninety days must leave ninety days, not one.
    expect(short?.periodEnd.getTime()).toBe(long?.periodEnd.getTime());
  });

  it("revokes access without erasing what the account had", async () => {
    const user = await makeUser();
    await grantAccess({ userId: user.id, plan: "monthly", days: 30 });

    const revoked = await revokeAccess(user.id);
    expect(revoked?.provider).toBe("manual");

    const row = await readSubscription(user.id);
    expect(row?.status).toBe("canceled");
    expect(hasActiveSubscription(row)).toBe(false);
    // The period end stays put — it is the record of what was granted, and
    // `hasActiveSubscription` already refuses a cancelled row on status alone.
    expect(row?.currentPeriodEnd).not.toBeNull();
  });

  it("refuses to write against an account that does not exist", async () => {
    expect(await grantAccess({ userId: randomUUID(), plan: "monthly", days: 30 })).toBeNull();
    expect(await revokeAccess(randomUUID())).toBeNull();
  });

  it("finds an account by part of its email, and treats the search as text", async () => {
    const user = await makeUser();

    const found = await listAccounts({ search: user.email.slice(0, 20) });
    expect(found.rows.some((account) => account.id === user.id)).toBe(true);
    expect(found.total).toBeGreaterThanOrEqual(1);

    // `_` is a single-character wildcard to `ilike`. Searching for it
    // literally must not match every address that merely has a character in
    // that position.
    const wildcard = await listAccounts({ search: "owner_acct-" });
    expect(wildcard.rows.some((account) => account.id === user.id)).toBe(false);
  });

  it("filters by status", async () => {
    const user = await makeUser();
    await grantAccess({ userId: user.id, plan: "monthly", days: 30 });

    const active = await listAccounts({ search: user.email, statusFilter: "active" });
    expect(active.rows.some((account) => account.id === user.id)).toBe(true);

    const freeTier = await listAccounts({ search: user.email, statusFilter: "free_tier" });
    expect(freeTier.rows.some((account) => account.id === user.id)).toBe(false);
  });

  it("paginates with a stable total across pages", async () => {
    await makeUser();
    await makeUser();

    const page1 = await listAccounts({ search: null, limit: 1, offset: 0 });
    const page2 = await listAccounts({ search: null, limit: 1, offset: 1 });

    expect(page1.rows).toHaveLength(1);
    expect(page1.total).toBe(page2.total);
    expect(page1.rows[0]?.id).not.toBe(page2.rows[0]?.id);
  });
});
