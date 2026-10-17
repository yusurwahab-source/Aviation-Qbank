import { z } from "zod";

/**
 * Turning what the mail provider sends into what the mailbox stores. Pure, and
 * tested: it is the one place a stranger's email is read, so it is also the
 * place that decides what is kept of it.
 */

/** The only part of the `email.received` webhook this app uses. The body is not in
 * it — the provider sends metadata and the body is fetched by id. */
export const receivedEventSchema = z.object({
  type: z.string(),
  data: z.object({
    email_id: z.string().min(1).max(64),
    from: z.string().max(500).optional(),
    to: z.array(z.string().max(500)).optional(),
    subject: z.string().max(1000).optional(),
    message_id: z.string().max(500).optional(),
  }),
});

export const MAX_STORED_BODY = 100_000;

/** "Ada Lovelace <ada@x.org>" → name and address. A bare address has no name. */
export function parseAddress(raw: string): { name: string | null; address: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.*?)\s*<([^<>\s]+)>\s*$/);
  if (match) {
    const name = match[1].replace(/^"|"$/g, "").trim();
    return { name: name || null, address: match[2].toLowerCase() };
  }
  return { name: null, address: trimmed.toLowerCase() };
}

/**
 * A readable plain-text version of an email that only came as HTML. This is
 * for *reading*, never for rendering: the output is shown as text, so it needs
 * to be legible, not safe to inject — and it is stored as text for that reason.
 */
export function plainTextFromHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** What is stored of a message body: text, bounded. */
export function storedBody(text: string | null | undefined, html: string | null | undefined): string {
  const body = text?.trim() ? text.trim() : html ? plainTextFromHtml(html) : "";
  return (body || "(no text)").slice(0, MAX_STORED_BODY);
}

/** "Re: …", once — replying to a reply does not stack prefixes. */
export function replySubject(subject: string): string {
  return /^re:\s/i.test(subject) ? subject : `Re: ${subject}`;
}
