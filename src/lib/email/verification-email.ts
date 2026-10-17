import { siteConfig } from "@/config/site";
import { VERIFICATION_TOKEN_LIFETIME_MS } from "@/lib/auth/verification-policy";

import { renderEmail } from "./layout";
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

  const { text, html } = renderEmail({
    preheader: "One tap to confirm your email address.",
    heading: `Welcome to ${siteConfig.name}`,
    greeting: "Welcome aboard,",
    paragraphs: [
      `Thanks for creating your ${siteConfig.name} account. Your practice questions are ready whenever you are.`,
      "Please confirm this email address. It lets you subscribe later and keeps your account recoverable.",
    ],
    button: { label: "Confirm my email", url: link },
    afterButton: [
      `The link works once, and stops working after ${expiry}. After opening it, press the confirm button on the page.`,
    ],
    note: "If you did not create an account, you can ignore this email. Nothing happens unless the link is opened.",
  });

  return { to, subject: `Confirm your ${siteConfig.name} email`, text, html };
}
