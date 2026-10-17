import { z } from "zod";

import { siteConfig } from "@/config/site";
import { emailSchema } from "@/lib/auth/credentials";

import type { EmailMessage } from "@/lib/email/send";

/**
 * The contact form: what it accepts, and the message it becomes.
 *
 * Pure — no database, no mail provider — so both halves can be unit tested.
 * The action in `app/contact/actions.ts` only wires this to the rate limiter
 * and to `sendEmail`.
 */

export const CONTACT_TOPICS = [
  { value: "wrong-question", label: "A question I think is wrong" },
  { value: "account", label: "A problem with my account or log in" },
  { value: "billing", label: "Billing or my subscription" },
  { value: "request", label: "An aircraft or subject I would like added" },
  { value: "other", label: "Something else" },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

export const MIN_MESSAGE_LENGTH = 10;
export const MAX_MESSAGE_LENGTH = 4000;
const MAX_NAME_LENGTH = 80;
const MAX_QUESTION_ID_LENGTH = 40;

/** Control characters have no place in a name or an id, and CR/LF in anything
 *  that ends up near a header is how header injection starts. */
function stripControl(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
}

export const contactSchema = z.object({
  name: z
    .string()
    .transform(stripControl)
    .pipe(
      z
        .string()
        .min(1, "Tell us your name")
        .max(MAX_NAME_LENGTH, "That name is too long"),
    ),
  email: emailSchema,
  topic: z.enum(CONTACT_TOPICS.map((t) => t.value) as [ContactTopic, ...ContactTopic[]], {
    message: "Choose what this is about",
  }),
  questionId: z
    .string()
    .transform(stripControl)
    .pipe(z.string().max(MAX_QUESTION_ID_LENGTH, "That question id is too long"))
    .optional(),
  message: z
    .string()
    .transform((value) => value.replace(/\r\n/g, "\n").trim())
    .pipe(
      z
        .string()
        .min(MIN_MESSAGE_LENGTH, `Write at least ${MIN_MESSAGE_LENGTH} characters`)
        .max(MAX_MESSAGE_LENGTH, `Keep it under ${MAX_MESSAGE_LENGTH} characters`),
    ),
});

export type ContactInput = z.infer<typeof contactSchema>;

export function topicLabel(topic: ContactTopic): string {
  return CONTACT_TOPICS.find((t) => t.value === topic)?.label ?? topic;
}

/**
 * The email that lands in the owner's inbox.
 *
 * `replyTo` is the visitor, so answering is just "Reply". The visitor's text is
 * never used as the `from` address — that stays the verified sending domain,
 * which is the only thing that keeps this deliverable.
 */
export function contactEmail(
  to: string,
  input: ContactInput,
  context: { signedInAs?: string | null } = {},
): EmailMessage {
  const topic = topicLabel(input.topic);

  const lines = [
    `New message from the ${siteConfig.name} contact form.`,
    "",
    `Name:    ${input.name}`,
    `Email:   ${input.email}`,
    `Topic:   ${topic}`,
  ];
  if (input.questionId) lines.push(`Question: ${input.questionId}`);
  if (context.signedInAs) lines.push(`Signed in as: ${context.signedInAs}`);
  lines.push("", "Message:", "", input.message);

  const html = [
    `<p>New message from the ${escapeHtml(siteConfig.name)} contact form.</p>`,
    "<table cellpadding=\"4\">",
    `<tr><td><strong>Name</strong></td><td>${escapeHtml(input.name)}</td></tr>`,
    `<tr><td><strong>Email</strong></td><td>${escapeHtml(input.email)}</td></tr>`,
    `<tr><td><strong>Topic</strong></td><td>${escapeHtml(topic)}</td></tr>`,
    input.questionId
      ? `<tr><td><strong>Question</strong></td><td>${escapeHtml(input.questionId)}</td></tr>`
      : "",
    context.signedInAs
      ? `<tr><td><strong>Signed in as</strong></td><td>${escapeHtml(context.signedInAs)}</td></tr>`
      : "",
    "</table>",
    `<p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    to,
    subject: `[${siteConfig.name} contact] ${topic} — ${input.name}`,
    text: lines.join("\n"),
    html,
    replyTo: input.email,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
