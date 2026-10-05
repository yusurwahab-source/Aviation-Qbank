import { siteConfig } from "@/config/site";

import type { EmailMessage } from "./send";

/**
 * The "your password was changed" notice.
 *
 * Sent after every change — from the account page and from a reset link —
 * so that somebody who has lost control of an account hears about it in the
 * inbox the thief cannot see. Pure, like `resetEmail`: it takes the address
 * and a link and returns text.
 *
 * The wording assumes the reader may not have done this. The first thing it
 * says is what happened; the second is what to do if it was not them.
 */
export function passwordChangedEmail(to: string, resetLink: string): EmailMessage {
  const text = [
    `The password for your ${siteConfig.name} account was just changed, and every other device was signed out.`,
    "",
    "If that was you, there is nothing to do.",
    "",
    "If it was not you, someone else may have access. Set a new password now:",
    "",
    resetLink,
  ].join("\n");

  const html = [
    `<p>The password for your ${siteConfig.name} account was just changed, and every other device was signed out.</p>`,
    "<p>If that was you, there is nothing to do.</p>",
    "<p>If it was not you, someone else may have access. ",
    `<a href="${escapeHtml(resetLink)}">Set a new password now</a>.</p>`,
  ].join("\n");

  return { to, subject: `Your ${siteConfig.name} password was changed`, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
