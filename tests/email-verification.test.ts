import { randomUUID, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDb } from "@/db";
import {
  consumeVerificationToken,
  findVerificationToken,
  issueVerificationToken,
} from "@/db/email-verification";
import { emailVerificationTokens, users } from "@/db/schema";
import { hashPassword } from "@/lib/password";

/**
 * Verification links against a real database. The rules are unit tested in
 * `verification-policy.test.ts`; what is checked here is that the queries
 * enforce them — above all that a link verifies exactly once, which lives in
 * a `where` clause and not in any pure function.
 */

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("email verification tokens", () => {
  const created: string[] = [];

  async function makeUser(): Promise<{ id: string; email: string }> {
    const [row] = await getDb()
      .insert(users)
      .values({
        email: `verify-${randomUUID()}@example.invalid`,
        passwordHash: await hashPassword("the-original-password"),
      })
      .returning({ id: users.id, email: users.email });
    created.push(row.id);
    return row;
  }

  async function verifiedAt(userId: string): Promise<Date | null> {
    const [row] = await getDb()
      .select({ at: users.emailVerifiedAt })
      .from(users)
      .where(eq(users.id, userId));
    return row.at;
  }

  let user: { id: string; email: string };

  beforeAll(async () => {
    user = await makeUser();
  });

  afterAll(async () => {
    for (const id of created) await getDb().delete(users).where(eq(users.id, id));
  });

  it("starts unverified", async () => {
    expect(await verifiedAt(user.id)).toBeNull();
  });

  it("stores only the hash of the token", async () => {
    const token = await issueVerificationToken(user.id);
    const rows = await getDb()
      .select({ id: emailVerificationTokens.id })
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, user.id));

    expect(rows).toHaveLength(1);
    expect(rows[0].id).not.toBe(token);
    expect(rows[0].id).toBe(createHash("sha256").update(token).digest("hex"));
  });

  it("looks a fresh link up without spending it", async () => {
    const token = await issueVerificationToken(user.id);
    expect(await findVerificationToken(token)).toEqual({
      state: "valid",
      userId: user.id,
      email: user.email,
    });
    expect(await findVerificationToken(token)).toMatchObject({ state: "valid" });
    expect(await verifiedAt(user.id)).toBeNull();
  });

  it("refuses a token that was never issued", async () => {
    expect(await findVerificationToken("not-a-real-token")).toEqual({ state: "unknown" });
    expect(await consumeVerificationToken("not-a-real-token")).toEqual({
      ok: false,
      state: "unknown",
    });
  });

  it("verifies the address once, and refuses a second use", async () => {
    const token = await issueVerificationToken(user.id);

    expect(await consumeVerificationToken(token)).toEqual({ ok: true, userId: user.id });
    expect(await verifiedAt(user.id)).not.toBeNull();

    expect(await consumeVerificationToken(token)).toEqual({ ok: false, state: "used" });
  });

  it("lets only one of two racing submissions win", async () => {
    const racer = await makeUser();
    const token = await issueVerificationToken(racer.id);

    const results = await Promise.all([
      consumeVerificationToken(token),
      consumeVerificationToken(token),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
  });

  it("only the newest link works", async () => {
    const other = await makeUser();
    const older = await issueVerificationToken(other.id);
    const newer = await issueVerificationToken(other.id);

    expect(await findVerificationToken(older)).toEqual({ state: "unknown" });
    expect(await findVerificationToken(newer)).toMatchObject({ state: "valid" });
  });

  it("never verifies anybody with an expired link", async () => {
    const other = await makeUser();
    const token = await issueVerificationToken(other.id);

    await getDb()
      .update(emailVerificationTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(emailVerificationTokens.userId, other.id));

    expect(await consumeVerificationToken(token)).toEqual({ ok: false, state: "expired" });
    expect(await verifiedAt(other.id)).toBeNull();
  });
});
