import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Card, PageHeading } from "@/components/ui";
import { getBroadcast } from "@/db/broadcasts";
import { AUDIENCE_LABELS, isAudience } from "@/lib/broadcast/audience";
import { requireOwner } from "@/lib/auth/require-owner";

import { OwnerNav, OwnerPageError, describeError, formatDay, isNextControlFlowError } from "../../owner-ui";
import { RetryButton } from "../retry-button";
import { SendProgress } from "../send-progress";

export const metadata: Metadata = { title: "Message" };
export const dynamic = "force-dynamic";

export default async function OwnerMessagePage({
  params,
  searchParams,
}: {
  params: Promise<{ broadcastId: string }>;
  searchParams: Promise<{ start?: string | string[] }>;
}) {
  const { broadcastId } = await params;
  const query = await searchParams;
  const autoStart = (Array.isArray(query.start) ? query.start[0] : query.start) === "1";

  let broadcast: Awaited<ReturnType<typeof getBroadcast>>;
  try {
    await requireOwner();
    broadcast = /^[0-9a-f-]{36}$/i.test(broadcastId) ? await getBroadcast(broadcastId) : null;
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    console.error("Failed to load a message:", error);
    return (
      <>
        <PageHeading title="Message" />
        <OwnerNav current="/owner/messages" />
        <OwnerPageError detail={describeError(error)} />
      </>
    );
  }

  if (!broadcast) notFound();

  const audience = isAudience(broadcast.audience) ? AUDIENCE_LABELS[broadcast.audience].label : broadcast.audience;

  return (
    <>
      <PageHeading
        title={broadcast.subject}
        subtitle={`${audience}${broadcast.onlyConfirmed ? ", confirmed addresses only" : ""} · queued ${formatDay(
          broadcast.createdAt,
        )} by ${broadcast.createdByEmail}`}
      />
      <OwnerNav current="/owner/messages" />

      <Card className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Delivery</h2>
        <SendProgress broadcastId={broadcast.id} initial={broadcast.counts} autoStart={autoStart} />
        {broadcast.counts.failed > 0 ? <RetryButton broadcastId={broadcast.id} /> : null}
      </Card>

      {broadcast.failures.length > 0 ? (
        <Card className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Failed</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {broadcast.failures.map((failure) => (
              <li key={failure.email}>
                <span className="text-foreground">{failure.email}</span> — {failure.error ?? "unknown error"}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            A provider&rsquo;s daily or per-second limit is the usual cause; queue them again once it
            has reset. Showing up to 50.
          </p>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Message</h2>
        <p className="whitespace-pre-wrap text-sm text-foreground">{broadcast.body}</p>
      </Card>

      <p className="mt-6 text-sm">
        <Link href="/owner/messages" className="font-medium text-brand-ink hover:underline">
          ← All messages
        </Link>
      </p>
    </>
  );
}
