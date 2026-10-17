import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Badge, Card, PageHeading } from "@/components/ui";
import { getMessage, listReplies, markRead } from "@/db/mailbox";
import { requireOwner } from "@/lib/auth/require-owner";
import { replySubject } from "@/lib/mail/parse";

import { OwnerNav, formatDateTime } from "../../owner-ui";
import { MailForm } from "../mail-form";

export const metadata: Metadata = { title: "Message" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One message, read as plain text, with the replies already sent and a form to
 * answer it. Opening an unread message marks it read; that is a write on a
 * GET, which is acceptable here only because the one person who can reach it
 * is the one whose inbox it is.
 */
export default async function OwnerMessagePage({ params }: { params: Promise<{ messageId: string }> }) {
  await requireOwner();
  const { messageId } = await params;
  if (!UUID.test(messageId)) notFound();

  const message = await getMessage(messageId);
  if (!message) notFound();

  if (message.direction === "in" && !message.readAt) await markRead(message.id);
  const replies = message.direction === "in" ? await listReplies(message.id) : [];

  // A contact-form message carries the visitor's address as reply-to; the
  // sender of that row is the site itself.
  const replyAddress = message.replyTo ?? (message.direction === "in" ? message.fromAddress : message.toAddress);

  return (
    <>
      <PageHeading title={message.subject} subtitle={`${formatDateTime(message.createdAt)}`} />
      <OwnerNav current="/owner/mail" />

      <p className="mb-4">
        <Link href={message.direction === "in" ? "/owner/mail" : "/owner/mail?box=out"} className="text-sm text-brand-ink hover:underline">
          ← Back to {message.direction === "in" ? "Inbox" : "Sent"}
        </Link>
      </p>

      <Card className="mb-6">
        <dl className="mb-4 grid gap-1 text-sm">
          <div className="flex gap-2">
            <dt className="w-12 shrink-0 text-muted-foreground">From</dt>
            <dd className="text-foreground">{message.fromName ? `${message.fromName} <${message.fromAddress}>` : message.fromAddress}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-12 shrink-0 text-muted-foreground">To</dt>
            <dd className="text-foreground">{message.toAddress}</dd>
          </div>
          {message.replyTo ? (
            <div className="flex gap-2">
              <dt className="w-12 shrink-0 text-muted-foreground">Reply</dt>
              <dd className="text-foreground">{message.replyTo}</dd>
            </div>
          ) : null}
          {message.status === "failed" ? (
            <div>
              <Badge tone="incorrect">Not delivered</Badge>
            </div>
          ) : null}
        </dl>
        {/* Text only, by design: a stranger wrote this. */}
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">{message.textBody}</pre>
      </Card>

      {replies.length > 0 ? (
        <div className="mb-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Your replies</h2>
          {replies.map((reply) => (
            <Card key={reply.id}>
              <p className="mb-2 text-xs text-muted-foreground">
                {formatDateTime(reply.createdAt)} · to {reply.toAddress}
                {reply.status === "failed" ? " · not delivered" : ""}
              </p>
              <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground">{reply.textBody}</pre>
            </Card>
          ))}
        </div>
      ) : null}

      {message.direction === "in" ? (
        <>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Reply</h2>
          <Card>
            <MailForm
              defaultTo={replyAddress}
              defaultSubject={replySubject(message.subject)}
              inReplyToId={message.id}
              submitLabel="Send reply"
            />
          </Card>
        </>
      ) : null}
    </>
  );
}
