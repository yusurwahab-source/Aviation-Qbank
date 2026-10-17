import { randomUUID } from "node:crypto";
import { eq, like } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { getDb } from "@/db";
import { countUnread, getMessage, insertInbound, insertOutbound, listReplies, markRead } from "@/db/mailbox";
import { mailboxMessages } from "@/db/schema";

/**
 * The mailbox against a real database. Other runs leave rows in the same
 * table, so every assertion is about the rows this file made, found by the
 * marker in their subject — never a total.
 */

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;
const marker = `mailbox-test-${randomUUID()}`;

const inbound = (providerId: string | null) => ({
  source: "resend" as const,
  fromAddress: "sender@example.com",
  fromName: "Sender",
  toAddress: "support@example.com",
  subject: `${marker} hello`,
  textBody: "Body",
  replyTo: null,
  providerId,
  inReplyToId: null,
});

describeDb("mailbox", () => {
  afterAll(async () => {
    await getDb().delete(mailboxMessages).where(like(mailboxMessages.subject, `${marker}%`));
  });

  it("stores a message once however many times the provider delivers it", async () => {
    const providerId = `evt-${randomUUID()}`;
    const first = await insertInbound(inbound(providerId));
    const second = await insertInbound(inbound(providerId));
    expect(first?.direction).toBe("in");
    expect(first?.status).toBe("received");
    expect(second).toBeNull();
    const rows = await getDb().select().from(mailboxMessages).where(eq(mailboxMessages.providerId, providerId));
    expect(rows).toHaveLength(1);
  });

  it("allows many contact-form messages, which have no provider id", async () => {
    const a = await insertInbound({ ...inbound(null), source: "contact" });
    const b = await insertInbound({ ...inbound(null), source: "contact" });
    expect(a?.id).toBeTruthy();
    expect(b?.id).toBeTruthy();
    expect(a?.id).not.toBe(b?.id);
  });

  it("counts unread, and opening a message marks it read once", async () => {
    const message = await insertInbound(inbound(`evt-${randomUUID()}`));
    const before = await countUnread();
    await markRead(message!.id);
    const read = await getMessage(message!.id);
    expect(read?.readAt).toBeInstanceOf(Date);
    expect(await countUnread()).toBe(before - 1);
    const firstReadAt = read!.readAt!.getTime();
    await markRead(message!.id);
    expect((await getMessage(message!.id))!.readAt!.getTime()).toBe(firstReadAt);
  });

  it("keeps a reply, including a failed one, attached to the message it answers", async () => {
    const message = await insertInbound(inbound(`evt-${randomUUID()}`));
    await insertOutbound({
      fromAddress: "support@example.com",
      toAddress: "sender@example.com",
      subject: `${marker} Re: hello`,
      textBody: "Thanks",
      inReplyToId: message!.id,
      status: "sent",
    });
    await insertOutbound({
      fromAddress: "support@example.com",
      toAddress: "sender@example.com",
      subject: `${marker} Re: hello again`,
      textBody: "Again",
      inReplyToId: message!.id,
      status: "failed",
      error: "429",
    });
    const replies = await listReplies(message!.id);
    expect(replies.map((r) => r.status)).toEqual(["sent", "failed"]);
    expect(replies.every((r) => r.direction === "out")).toBe(true);
  });
});
