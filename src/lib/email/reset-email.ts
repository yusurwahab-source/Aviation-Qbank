import { siteConfig } from "@/config/site";
import { RESET_TOKEN_LIFETIME_MS } from "@/lib/auth/reset-policy";

import { emailButton, emailShell, escapeHtml } from "./template";
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
    `Somebody asked to reset the password for your ${siteConfig.name} account.`,
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

  const html = emailShell(
    [
      `<p>Somebody asked to reset the password for your ${escapeHtml(siteConfig.name)} account.</p>`,
      "<p>If it was you, choose a new one here:</p>",
      emailButton("Set a new password", link),
      `<p style="color:#64748b;font-size:13px;">The link works once, and stops working after ${expiry}.</p>`,
      `<p style="color:#64748b;font-size:13px;">If it was not you, you can ignore this email. Your password has not been changed, and nobody can change it without this link.</p>`,
    ].join("\n"),
    { preheader: `Reset your ${siteConfig.name} password` },
  );

  return {
    to,
    subject: `Reset your ${siteConfig.name} password`,
    text,
    html,
  };
}
