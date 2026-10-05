import "server-only";

import { randomBytes } from "node:crypto";

import { claimDeliveries, markDelivery, setDeliveryToken } from "@/db/broadcasts";
import { getBroadcast } from "@/db/broadcasts";
import { hashUnsubscribeToken } from "@/db/unsubscribe";
import { appUrl, emailIsConfigured, sendEmail, type EmailMessage, type EmailOutcome } from "@/lib/email/send";

import { composeBroadcastEmail } from "./compose";

/**
 * Sends the next few emails of a broadcast.
 *
 * A broadcast goes out a handful at a time rather than in one request: a
 * serverless function has seconds, not minutes, and mail providers limit how
 * fast they accept messages (Resend's default is two a second). The caller —
 * the progress screen — simply asks again until nothing is left, and a closed
 * tab leaves a broadcast that can be continued from where it stopped.
 */

export const BATCH_SIZE = 8;

/** Spacing between sends, safely under a two-a-second provider limit. */
const SPACING_MS = 550;

export type BatchResult = {
  sent: number;
  failed: number;
  /** Deliveries still waiting, including any claimed by another sender. */
  remaining: number;
};

export async function sendNextBatch(
  broadcastId: string,
  deps: {
    send?: (message: EmailMessage) => Promise<EmailOutcome>;
    configured?: () => boolean;
    spacingMs?: number;
  } = {},
): Promise<BatchResult | { error: string }> {
  const send = deps.send ?? sendEmail;
  const configured = deps.configured ?? emailIsConfigured;
  const spacing = deps.spacingMs ?? SPACING_MS;

  // Without a provider `sendEmail` only prints to the server log, which would
  // mark every delivery "sent" for mail nobody received. Refuse instead.
  if (!configured()) {
    return { error: "No mail provider is configured, so nothing can be sent." };
  }

  const broadcast = await getBroadcast(broadcastId);
  if (!broadcast) return { error: "That message no longer exists." };

  const batch = await claimDeliveries(broadcastId, BATCH_SIZE);
  let sent = 0;
  let failed = 0;

  for (const [index, delivery] of batch.entries()) {
    if (index > 0 && spacing > 0) await new Promise((resolve) => setTimeout(resolve, spacing));

    try {
      const token = randomBytes(32).toString("base64url");
      await setDeliveryToken(delivery.id, hashUnsubscribeToken(token));

      const outcome = await send(
        composeBroadcastEmail({
          to: delivery.email,
          subject: broadcast.subject,
          body: broadcast.body,
          unsubscribeUrl: `${appUrl()}/unsubscribe?token=${encodeURIComponent(token)}`,
          oneClickUrl: `${appUrl()}/api/unsubscribe?token=${encodeURIComponent(token)}`,
        }),
      );

      if (outcome.delivered) {
        await markDelivery(delivery.id, { sent: true });
        sent += 1;
      } else {
        await markDelivery(delivery.id, { sent: false, error: outcome.error ?? "Not delivered" });
        failed += 1;
      }
    } catch (error) {
      await markDelivery(delivery.id, { sent: false, error: (error as Error).message });
      failed += 1;
    }
  }

  const after = await getBroadcast(broadcastId);
  const remaining = after ? after.counts.queued + after.counts.sending : 0;
  return { sent, failed, remaining };
}
