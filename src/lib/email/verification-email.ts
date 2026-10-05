import { siteConfig } from "@/config/site";
import { VERIFICATION_TOKEN_LIFETIME_MS } from "@/lib/auth/verification-policy";

import type { EmailMessage } from "./send";

/**
 * The "confirm your email address" message. Pure: a link in, text out.
 *
 * Like the reset email, it is written for somebody who may not have asked
 * for it — an address typed into a sign-up form by someone else — so it says
 * plainly that ignoring it is enough.
 */

const LIFETIME_HOURS = Math.round(VERIFICATION_TOKEN_LIFETIME_MS / 3_600_000);

export function verificationEmail(to: string, link: string): EmailMessage {
  const expiry = LIFETIME_HOURS === 24 ? "24 hours" : `${LIFETIME_HOURS} hours`;

  const text = [
    `Confirm this email address for your ${siteConfig.name} account.`,
    "",
    "Open this link and press the confirm button:",
    "",
    link,
    "",
    `The link works once, and stops working after ${expiry}.`,
    "",
    "If you did not create an account, you can ignore this email. Nothing happens",
    "unless the link is opened.",
  ].join("\n");

  const html = [
    `<p>Confirm this email address for your ${siteConfig.name} account.</p>`,
    `<p><a href="${escapeHtml(link)}">Confirm my email</a></p>`,
    `<p>The link works once, and stops working after ${expiry}.</p>`,
    "<p>If you did not create an account, you can ignore this email. Nothing happens ",
    "unless the link is opened.</p>",
  ].join("\n");

  return { to, subject: `Confirm your ${siteConfig.name} email`, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
