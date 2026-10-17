import { z } from "zod";

import { siteConfig } from "@/config/site";
import { renderEmail } from "@/lib/email/layout";
import type { EmailMessage } from "@/lib/email/send";

import { AUDIENCES } from "./audience";

/**
 * Turning what the owner typed into an email, and checking it first.
 *
 * Pure, like `resetEmail`: nothing here touches the network or the database,
 * so the wording rules — the footer that cannot be left off, the escaping —
 * are asserted directly rather than trusted.
 */

export const MAX_SUBJECT_LENGTH = 150;
export const MAX_BODY_LENGTH = 10_000;

export const broadcastInputSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "Write a subject.")
    .max(MAX_SUBJECT_LENGTH, `Keep the subject under ${MAX_SUBJECT_LENGTH} characters.`)
    // A header injection needs a line break; a subject has no use for one.
    .refine((value) => !/[\r\n]/.test(value), "A subject is one line."),
  body: z
    .string()
    .trim()
    .min(1, "Write a message.")
    .max(MAX_BODY_LENGTH, `Keep the message under ${MAX_BODY_LENGTH} characters.`),
  audience: z.enum(AUDIENCES),
  onlyConfirmed: z.boolean(),
});

export type BroadcastInput = z.infer<typeof broadcastInputSchema>;

/**
 * The message as sent: the owner's text, then a footer saying why the
 * recipient is getting it and how to stop. The footer is not optional and not
 * part of what the owner writes — a broadcast without a way out is how a
 * sending domain ends up in spam folders, and it is a legal requirement for
 * marketing mail in the EU besides.
 *
 * `unsubscribeUrl` is the page a person opens; `oneClickUrl` is the endpoint a
 * mail client's own "Unsubscribe" button posts to (RFC 8058). Both carry a
 * token unique to this one email.
 */
export function composeBroadcastEmail(input: {
  to: string;
  subject: string;
  body: string;
  unsubscribeUrl: string;
  oneClickUrl?: string;
}): EmailMessage {
  const { to, subject, body, unsubscribeUrl, oneClickUrl } = input;

  const footerText = [
    "",
    "—",
    `You are receiving this because you have an account on ${siteConfig.name}.`,
    `Unsubscribe from these messages: ${unsubscribeUrl}`,
  ].join("\n");

  const bodyHtml = paragraphs(body)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#212529">${linkify(escapeHtml(paragraph)).replace(/\n/g, "<br>")}</p>`,
    )
    .join("\n");

  const { html } = renderEmail({
    preheader: subject,
    heading: subject,
    paragraphs: [],
    bodyHtml,
    signOff: false,
    footerNote: {
      text: footerText,
      html: `You are receiving this because you have an account on ${escapeHtml(siteConfig.name)}. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#5C6670">Unsubscribe from these messages</a>.`,
    },
  });

  return {
    to,
    subject,
    text: `${body}\n${footerText}`,
    html,
    headers: oneClickUrl
      ? {
          "List-Unsubscribe": `<${oneClickUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : { "List-Unsubscribe": `<${unsubscribeUrl}>` },
  };
}

/** Blank lines separate paragraphs; single line breaks stay inside one. */
function paragraphs(body: string): string[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Makes bare http(s) addresses clickable. Runs on text that is already
 * escaped, so it only ever wraps characters that cannot start a tag or break
 * an attribute (`&quot;` and friends are left outside the match).
 */
function linkify(escaped: string): string {
  return escaped.replace(
    /\bhttps?:\/\/[^\s<>"]+/g,
    (url) => `<a href="${url}">${url}</a>`,
  );
}
