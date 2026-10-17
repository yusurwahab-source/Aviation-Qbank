import { siteConfig } from "@/config/site";
import { RESET_TOKEN_LIFETIME_MS } from "@/lib/auth/reset-policy";

import { formatEmailTime, renderEmail } from "./layout";
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

export function resetEmail(to: string, link: string, at: Date = new Date()): EmailMessage {
  const expiry =
    LIFETIME_MINUTES === 60 ? "one hour" : `${LIFETIME_MINUTES} minutes`;

  const { text, html } = renderEmail({
    preheader: "Choose a new password for your account.",
    heading: "Reset your password",
    greeting: "Hello,",
    paragraphs: [
      `Welcome back to ${siteConfig.name}. Somebody asked to reset the password for your account.`,
      `If it was you, press the button below to choose a new one. For your security the link works once and stops working after ${expiry}.`,
    ],
    button: { label: "Set a new password", url: link },
    details: [
      { label: "Account", value: to },
      { label: "Requested", value: formatEmailTime(at) },
      { label: "Link valid for", value: `${expiry}, one use` },
    ],
    note: "Not you? Ignore this email. Your password has not been changed, and nobody can change it without this link. Never share this link with anyone, including people who say they work for us.",
  });

  return {
    to,
    subject: `Reset your ${siteConfig.name} password`,
    text,
    html,
  };
}
