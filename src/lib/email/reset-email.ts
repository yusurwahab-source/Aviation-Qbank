import { RESET_TOKEN_LIFETIME_MS } from "@/lib/auth/reset-policy";

import type { EmailMessage } from "./send";

/**
 * The password reset message.
 *
 * Pure — it takes a link and returns text — so the wording can be unit tested,
 * and so nothing about composing it needs a mail provider.
 *
 * The wording does a job beyond politeness. Somebody who did *not* ask for
 * this needs to know that ignoring the email is enough, and that nothing has
 * changed yet; that is the difference between a reset flow that reassures a
 * worried person and one that alarms them.
 */

const LIFETIME_MINUTES = Math.round(RESET_TOKEN_LIFETIME_MS / 60000);

export function resetEmail(to: string, link: string): EmailMessage {
  const expiry =
    LIFETIME_MINUTES === 60 ? "one hour" : `${LIFETIME_MINUTES} minutes`;

  const text = [
    "Somebody asked to reset the password for your Aviation Question Bank account.",
    "",
    "If it was you, open this link to choose a new one:",
    "",
    link,
    "",
    `The link works once, and stops working after ${expiry}.`,
    "",
    "If it was not you, you can ignore this email. Your password has not been",
    "changed, and nobody can change it without this link.",
  ].join("\n");

  const html = [
    "<p>Somebody asked to reset the password for your Aviation Question Bank account.</p>",
    "<p>If it was you, choose a new one here:</p>",
    `<p><a href="${escapeHtml(link)}">Set a new password</a></p>`,
    `<p>The link works once, and stops working after ${expiry}.</p>`,
    "<p>If it was not you, you can ignore this email. Your password has not been changed, ",
    "and nobody can change it without this link.</p>",
  ].join("\n");

  return {
    to,
    subject: "Reset your Aviation Question Bank password",
    text,
    html,
  };
}

/**
 * The link is built from our own base URL and a random token, so there is
 * nothing hostile in it today. Escaped anyway: an unescaped value in an
 * attribute is the kind of thing that stops being safe the moment somebody
 * changes where the URL comes from.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
