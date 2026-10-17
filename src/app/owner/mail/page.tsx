import Link from "next/link";
import type { Metadata } from "next";

import { Badge, Card, PageHeading } from "@/components/ui";
import { countUnread, listMessages, type Box } from "@/db/mailbox";
import { requireOwner } from "@/lib/auth/require-owner";
import { emailIsConfigured } from "@/lib/email/send";
import { inboundAddress, inboundIsConfigured } from "@/lib/mail/config";

import {
  DataTable,
  OwnerNav,
  OwnerPageError,
  describeError,
  formatDateTime,
  isNextControlFlowError,
} from "../owner-ui";
import { MailForm } from "./mail-form";

export const metadata: Metadata = { title: "Mail" };
export const dynamic = "force-dynamic";

/**
 * The owner's mailbox: what came in, what went out, and a way to write.
 *
 * Inbox holds mail sent to the support address and messages typed into the
 * contact form. Everything is shown as plain text.
 */
export default async function OwnerMailPage({ searchParams }: { searchParams: Promise<{ box?: string }> }) {
  const params = await searchParams;
  const box: Box = params.box === "out" ? "out" : "in";

  let messages: Awaited<ReturnType<typeof listMessages>>;
  let unread: number;
  try {
    await requireOwner();
    [messages, unread] = await Promise.all([listMessages(box), countUnread()]);
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    console.error("Failed to load mail:", error);
    return (
      <>
        <PageHeading title="Mail" />
        <OwnerNav current="/owner/mail" />
        <OwnerPageError detail={describeError(error)} />
      </>
    );
  }

  const inbound = inboundIsConfigured();
  const address = inboundAddress();

  return (
    <>
      <PageHeading title="Mail" subtitle="Read and answer messages, and write new ones." />
      <OwnerNav current="/owner/mail" />

      <Card className="mb-6">
        <h2 className="text-sm font-semibold text-foreground">Status</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          <li>
            <Badge tone={emailIsConfigured() ? "correct" : "incorrect"}>
              {emailIsConfigured() ? "Sending on" : "Sending off"}
            </Badge>{" "}
            {emailIsConfigured() ? "Mail goes out through the provider." : "Set RESEND_API_KEY and EMAIL_FROM."}
          </li>
          <li>
            <Badge tone={inbound ? "correct" : "warning"}>{inbound ? "Receiving on" : "Receiving not set up"}</Badge>{" "}
            {inbound
              ? `Mail sent to ${address} arrives below.`
              : "Contact-form messages still arrive below. To receive mail sent to your own address, enable receiving for the domain and set RESEND_WEBHOOK_SECRET and SUPPORT_EMAIL."}
          </li>
        </ul>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Mailbox">
        {(
          [
            ["in", unread > 0 ? `Inbox (${unread} new)` : "Inbox"],
            ["out", "Sent"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={key === "in" ? "/owner/mail" : "/owner/mail?box=out"}
            role="tab"
            aria-selected={box === key}
            className={`min-h-11 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              box === key
                ? "bg-brand text-on-solid"
                : "border border-border bg-surface text-muted-foreground hover:border-brand hover:text-brand-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <DataTable
        headers={[box === "in" ? "From" : "To", "Subject", "Date", ""]}
        empty={box === "in" ? "Nothing has arrived yet." : "Nothing has been sent from here yet."}
        rowKey={(row, index) => messages[index]?.id ?? index}
        rows={messages.map((message) => [
          box === "in" ? (message.fromName ? `${message.fromName} <${message.fromAddress}>` : message.fromAddress) : message.toAddress,
          <Link
            key={message.id}
            href={`/owner/mail/${message.id}`}
            className={`text-brand-ink hover:underline ${box === "in" && !message.readAt ? "font-semibold" : "font-medium"}`}
          >
            {message.subject}
          </Link>,
          formatDateTime(message.createdAt),
          message.status === "failed" ? (
            <Badge key="s" tone="incorrect">
              Failed
            </Badge>
          ) : message.source === "contact" ? (
            <Badge key="s">Contact form</Badge>
          ) : box === "in" && !message.readAt ? (
            <Badge key="s" tone="brand">
              New
            </Badge>
          ) : (
            ""
          ),
        ])}
      />

      <h2 className="mb-3 mt-8 text-lg font-semibold text-foreground">Write a message</h2>
      <Card>
        <MailForm />
      </Card>
    </>
  );
}
