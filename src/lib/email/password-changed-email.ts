import { siteConfig } from "@/config/site";

import { formatEmailTime, renderEmail } from "./layout";
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
export function passwordChangedEmail(to: string, resetLink: string, at: Date = new Date()): EmailMessage {
  const { text, html } = renderEmail({
    preheader: "Your password was changed and your other devices were signed out.",
    heading: "Your password was changed",
    greeting: "Hello,",
    paragraphs: [
      `The password for your ${siteConfig.name} account was just changed, and every other device was signed out.`,
      "If that was you, there is nothing to do. You are all set.",
      "If it was not you, someone else may have access. Set a new password now, then check that your email account is secure too.",
    ],
    button: { label: "Secure my account", url: resetLink },
    details: [
      { label: "Account", value: to },
      { label: "Changed", value: formatEmailTime(at) },
      { label: "Other devices", value: "Signed out" },
    ],
    note: "We will never ask for your password by email. If you need help, reply through the contact form on our website.",
  });

  return { to, subject: `Your ${siteConfig.name} password was changed`, text, html };
}
