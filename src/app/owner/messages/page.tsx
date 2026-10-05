import Link from "next/link";
import type { Metadata } from "next";

import { Card, PageHeading } from "@/components/ui";
import { countAudiences, listBroadcasts } from "@/db/broadcasts";
import { AUDIENCE_LABELS, isAudience } from "@/lib/broadcast/audience";
import { requireOwner } from "@/lib/auth/require-owner";
import { emailIsConfigured } from "@/lib/email/send";

import { DataTable, OwnerNav, OwnerPageError, describeError, formatDay, isNextControlFlowError } from "../owner-ui";
import { ComposeForm } from "./compose-form";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

/**
 * Writing to students, and the record of what has been sent.
 *
 * A message goes by email, to an audience chosen from the accounts the owner
 * already has a view of, and every one ends with an unsubscribe link the
 * owner cannot remove. Nothing here edits or deletes a past message — the
 * list is a log.
 */
export default async function OwnerMessagesPage() {
  let owner: Awaited<ReturnType<typeof requireOwner>>;
  let counts: Awaited<ReturnType<typeof countAudiences>>;
  let past: Awaited<ReturnType<typeof listBroadcasts>>;
  try {
    owner = await requireOwner();
    [counts, past] = await Promise.all([countAudiences(), listBroadcasts()]);
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    console.error("Failed to load messages:", error);
    return (
      <>
        <PageHeading title="Messages" />
        <OwnerNav current="/owner/messages" />
        <OwnerPageError detail={describeError(error)} />
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Messages"
        subtitle="Email your students. Sent a few at a time, with an unsubscribe link on every one."
      />
      <OwnerNav current="/owner/messages" />

      <Card className="mb-6">
        <ComposeForm counts={counts} configured={emailIsConfigured()} ownerEmail={owner.email} />
      </Card>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Sent messages</h2>
      <DataTable
        headers={["Sent", "Subject", "To", "Delivered"]}
        empty="Nothing has been sent yet."
        rows={past.map((broadcast) => {
          const total =
            broadcast.counts.queued + broadcast.counts.sending + broadcast.counts.sent + broadcast.counts.failed;
          return [
            formatDay(broadcast.createdAt),
            <Link
              key={broadcast.id}
              href={`/owner/messages/${broadcast.id}`}
              className="font-medium text-brand-ink hover:underline"
            >
              {broadcast.subject}
            </Link>,
            `${isAudience(broadcast.audience) ? AUDIENCE_LABELS[broadcast.audience].label : broadcast.audience}${
              broadcast.onlyConfirmed ? " · confirmed only" : ""
            }`,
            `${broadcast.counts.sent} of ${total}${
              broadcast.counts.failed > 0 ? ` · ${broadcast.counts.failed} failed` : ""
            }`,
          ];
        })}
      />
    </>
  );
}
