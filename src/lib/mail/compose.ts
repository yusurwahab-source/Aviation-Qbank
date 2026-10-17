import { z } from "zod";

import { emailSchema } from "@/lib/auth/credentials";
import { escapeHtml, renderEmail } from "@/lib/email/layout";
import type { EmailMessage } from "@/lib/email/send";

/**
 * A message the owner writes at `/owner/mail`, and the email it becomes.
 * Pure and tested, like `composeBroadcastEmail`.
 */

export const MAX_MAIL_SUBJECT = 200;
export const MAX_MAIL_BODY = 10_000;

export const ownerMailSchema = z.object({
  to: emailSchema,
  subject: z
    .string()
    .trim()
    .min(1, "Write a subject.")
    .max(MAX_MAIL_SUBJECT, `Keep the subject under ${MAX_MAIL_SUBJECT} characters.`)
    // A header injection needs a line break; a subject has no use for one.
    .refine((value) => !/[\r\n]/.test(value), "A subject is one line."),
  body: z.string().trim().min(1, "Write a message.").max(MAX_MAIL_BODY, `Keep the message under ${MAX_MAIL_BODY} characters.`),
  inReplyToId: z.string().uuid().optional(),
});

export type OwnerMailInput = z.infer<typeof ownerMailSchema>;

export function ownerMailEmail(input: {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}): EmailMessage {
  const paragraphs = input.body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const bodyHtml = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#212529">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("\n");

  const { html } = renderEmail({
    preheader: input.subject,
    heading: input.subject,
    paragraphs: [],
    bodyHtml,
    signOff: false,
  });

  return {
    to: input.to,
    subject: input.subject,
    text: input.body,
    html,
    ...(input.from ? { from: input.from } : {}),
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
  };
}
