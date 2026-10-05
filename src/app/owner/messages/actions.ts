"use server";

import { createBroadcast, requeueFailed } from "@/db/broadcasts";
import { broadcastInputSchema, composeBroadcastEmail } from "@/lib/broadcast/compose";
import { sendNextBatch, type BatchResult } from "@/lib/broadcast/send-batch";
import { requireOwner } from "@/lib/auth/require-owner";
import { appUrl, emailIsConfigured, sendEmail } from "@/lib/email/send";
import { ownerAction } from "@/lib/owner/audited-action";

export type ComposeState = {
  error?: string;
  message?: string;
  /** Set once a broadcast is queued; the form then sends the owner to its page. */
  broadcastId?: string;
};

const NO_PROVIDER = "No mail provider is configured (RESEND_API_KEY and EMAIL_FROM), so nothing can be sent.";

function parseCompose(formData: FormData) {
  const parsed = broadcastInputSchema.safeParse({
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
    audience: String(formData.get("audience") ?? ""),
    onlyConfirmed: formData.get("onlyConfirmed") === "on",
  });
  return parsed.success
    ? ({ ok: true, input: parsed.data } as const)
    : ({ ok: false, state: { error: parsed.error.issues[0]?.message ?? "Check the form." } } as const);
}

/**
 * Sends one copy of the message to the owner's own address — the way to see
 * exactly what students will receive, footer and all, before anyone does.
 * Sent through the same composer as the real thing. Logged like every owner
 * action, though it changes nothing.
 */
export const sendTest = ownerAction<ComposeState, { subject: string; body: string }>({
  action: "message.test",
  targetType: "message",

  parse(formData) {
    const parsed = parseCompose(formData);
    return parsed.ok
      ? { ok: true, input: { subject: parsed.input.subject, body: parsed.input.body } }
      : { ok: false, state: parsed.state };
  },

  async run(input, owner) {
    if (!emailIsConfigured()) return { ok: false, state: { error: NO_PROVIDER } };

    const outcome = await sendEmail(
      composeBroadcastEmail({
        to: owner.email,
        subject: `[Test] ${input.subject}`,
        body: input.body,
        unsubscribeUrl: `${appUrl()}/account`,
      }),
    );

    if (!outcome.delivered) {
      return { ok: false, state: { error: "The test email could not be sent. Check the server log." } };
    }
    return { ok: true, state: { message: `Test sent to ${owner.email}.` }, metadata: { subject: input.subject } };
  },
});

/**
 * Fixes the recipient list and records the broadcast. Nothing is sent here:
 * the progress page does that a few emails at a time, so this stays fast and
 * the audit row is written once, for the decision, not for every batch.
 *
 * `confirmed` is checked here again, not only by the two-step button in the
 * form — a server action is its own reachable entry point.
 */
export const queueBroadcast = ownerAction<
  ComposeState,
  { subject: string; body: string; audience: "everyone" | "subscribers" | "free" | "expiring"; onlyConfirmed: boolean }
>({
  action: "message.send",
  targetType: "message",

  parse(formData) {
    if (formData.get("confirmed") !== "yes") return { ok: false, state: { error: "Confirm the send first." } };
    return parseCompose(formData);
  },

  async run(input, owner) {
    if (!emailIsConfigured()) return { ok: false, state: { error: NO_PROVIDER } };

    const created = await createBroadcast({ ...input, createdByEmail: owner.email });
    if (!created) {
      return { ok: false, state: { error: "Nobody is in that audience, so there is nothing to send." } };
    }

    return {
      ok: true,
      state: { broadcastId: created.id },
      targetId: created.id,
      metadata: {
        subject: input.subject,
        audience: input.audience,
        onlyConfirmed: input.onlyConfirmed,
        recipients: created.recipients,
      },
    };
  },
  revalidate: [{ path: "/owner/messages" }],
});

export type RetryState = { error?: string; message?: string };

/** Puts the failed deliveries of a broadcast back in the queue. */
export const retryFailed = ownerAction<RetryState, { broadcastId: string }>({
  action: "message.retry",
  targetType: "message",

  parse(formData) {
    const broadcastId = String(formData.get("broadcastId") ?? "");
    return /^[0-9a-f-]{36}$/i.test(broadcastId)
      ? { ok: true, input: { broadcastId } }
      : { ok: false, state: { error: "Unknown message." } };
  },

  async run({ broadcastId }) {
    const count = await requeueFailed(broadcastId);
    if (count === 0) return { ok: false, state: { error: "Nothing failed, so nothing to retry." } };
    return {
      ok: true,
      state: { message: `${count} queued again.` },
      targetId: broadcastId,
      metadata: { requeued: count },
    };
  },
  revalidate: ({ broadcastId }) => [{ path: `/owner/messages/${broadcastId}` }],
});

/**
 * Sends the next few emails of a queued broadcast. Called by the progress
 * page in a loop.
 *
 * Not wrapped in `ownerAction`, deliberately: the decision to send was
 * logged once by `message.send`, and a row for every batch of eight would
 * bury it. The owner gate is still the first line — this is its own
 * reachable entry point like every action here.
 */
export async function sendBatch(broadcastId: string): Promise<BatchResult | { error: string }> {
  await requireOwner();
  if (!/^[0-9a-f-]{36}$/i.test(broadcastId)) return { error: "Unknown message." };
  return sendNextBatch(broadcastId);
}
