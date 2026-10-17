import "server-only";

import { and, count, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { mailboxMessages, type MailboxMessage } from "@/db/schema";

/**
 * The owner's mailbox: reads and writes of `mailbox_messages`.
 *
 * Like `db/owner.ts` and `db/broadcasts.ts`, nothing here takes a `userId` —
 * this is one inbox for the whole site, and the whole guard is that every
 * caller sits under `/owner` behind `requireOwner()` — with two exceptions
 * that are not owner pages and so are named: the provider's webhook route
 * (`insertInbound`, after its signature has been verified) and the public
 * contact form (`insertInbound` again). Both only ever *add* a row; nothing
 * outside `/owner` can read one back.
 */

export type Box = "in" | "out";

export type NewMessage = Omit<MailboxMessage, "id" | "createdAt" | "readAt" | "error"> & { error?: string | null };

/**
 * Adds a message that arrived. A provider id already seen is a no-op and
 * returns `null` — the webhook is delivered at least once, not exactly once.
 */
export async function insertInbound(
  message: Omit<NewMessage, "direction" | "status">,
): Promise<MailboxMessage | null> {
  const [row] = await getDb()
    .insert(mailboxMessages)
    .values({ ...message, direction: "in", status: "received" })
    .onConflictDoNothing({ target: mailboxMessages.providerId })
    .returning();
  return row ?? null;
}

/** Records what the owner sent, and whether the provider took it. */
export async function insertOutbound(
  message: Omit<NewMessage, "direction" | "source" | "providerId" | "replyTo" | "fromName"> & {
    status: "sent" | "failed";
  },
): Promise<MailboxMessage> {
  const [row] = await getDb()
    .insert(mailboxMessages)
    .values({ ...message, direction: "out", source: "owner", providerId: null, replyTo: null, fromName: null })
    .returning();
  return row;
}

export async function listMessages(box: Box, limit = 100): Promise<MailboxMessage[]> {
  return getDb()
    .select()
    .from(mailboxMessages)
    .where(eq(mailboxMessages.direction, box))
    .orderBy(desc(mailboxMessages.createdAt))
    .limit(limit);
}

export async function getMessage(id: string): Promise<MailboxMessage | null> {
  const [row] = await getDb().select().from(mailboxMessages).where(eq(mailboxMessages.id, id)).limit(1);
  return row ?? null;
}

export async function markRead(id: string): Promise<void> {
  await getDb()
    .update(mailboxMessages)
    .set({ readAt: new Date() })
    .where(and(eq(mailboxMessages.id, id), isNull(mailboxMessages.readAt)));
}

export async function countUnread(): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(mailboxMessages)
    .where(and(eq(mailboxMessages.direction, "in"), isNull(mailboxMessages.readAt)));
  return row?.value ?? 0;
}

/** Replies already sent to one message, oldest first, for its page. */
export async function listReplies(messageId: string): Promise<MailboxMessage[]> {
  return getDb()
    .select()
    .from(mailboxMessages)
    .where(eq(mailboxMessages.inReplyToId, messageId))
    .orderBy(mailboxMessages.createdAt);
}
