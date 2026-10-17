"use server";

import { insertOutbound } from "@/db/mailbox";
import { emailIsConfigured, sendEmail } from "@/lib/email/send";
import { inboundAddress, inboundIsConfigured } from "@/lib/mail/config";
import { ownerMailEmail, ownerMailSchema } from "@/lib/mail/compose";
import { ownerAction } from "@/lib/owner/audited-action";

export type MailState = {
  error?: string;
  sent?: boolean;
  /** Kept so a failed send does not wipe what the owner typed. */
  values?: { to: string; subject: string; body: string };
};

const NO_PROVIDER = "No mail provider is configured (RESEND_API_KEY and EMAIL_FROM), so nothing can be sent.";

/**
 * Sends one message from `/owner/mail` — a new one, or a reply to something in
 * the inbox — and keeps a copy.
 *
 * Replies are routed back to the mailbox only when inbound mail is actually
 * set up; before that, the owner's own address is the reply-to, so a person who
 * answers is never writing to an address nothing reads.
 */
export const sendMail = ownerAction<MailState, { to: string; subject: string; body: string; inReplyToId?: string }>({
  action: "mail.send",
  targetType: "mail",

  parse(formData) {
    const values = {
      to: String(formData.get("to") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      body: String(formData.get("body") ?? ""),
    };
    const parsed = ownerMailSchema.safeParse({
      ...values,
      inReplyToId: String(formData.get("inReplyToId") ?? "") || undefined,
    });
    return parsed.success
      ? { ok: true, input: parsed.data }
      : { ok: false, state: { error: parsed.error.issues[0]?.message ?? "Check the form.", values } };
  },

  async run(input, owner) {
    const values = { to: input.to, subject: input.subject, body: input.body };
    if (!emailIsConfigured()) return { ok: false, state: { error: NO_PROVIDER, values } };

    const support = inboundIsConfigured() ? inboundAddress() : null;
    const outcome = await sendEmail(
      ownerMailEmail({
        ...input,
        from: support ? `PilotQBank Support <${support}>` : undefined,
        replyTo: support ?? owner.email,
      }),
    );

    // Kept either way: a message that failed is worth seeing in Sent, marked as failed.
    const saved = await insertOutbound({
      fromAddress: support ?? owner.email,
      toAddress: input.to,
      subject: input.subject,
      textBody: input.body,
      inReplyToId: input.inReplyToId ?? null,
      status: outcome.delivered ? "sent" : "failed",
      error: outcome.delivered ? null : (outcome.error ?? "not delivered"),
    });

    if (!outcome.delivered) {
      return { ok: false, state: { error: "The mail provider did not accept the message. It is saved in Sent as failed.", values } };
    }

    return {
      ok: true,
      state: { sent: true },
      targetId: saved.id,
      metadata: { to: input.to, subject: input.subject, inReplyTo: input.inReplyToId ?? null },
    };
  },

  revalidate: [{ path: "/owner/mail", type: "layout" }],
});
