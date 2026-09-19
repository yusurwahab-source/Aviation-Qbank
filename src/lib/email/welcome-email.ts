import { siteConfig } from "@/config/site";

import { emailButton, emailShell, escapeHtml } from "./template";
import type { EmailMessage } from "./send";

/**
 * Sent once, right after `signUp` creates the account. Pure, like
 * `resetEmail` beside it — no mail provider needed to see what it says.
 */
export function welcomeEmail(to: string, appUrl: string): EmailMessage {
  const text = [
    `Welcome to ${siteConfig.name}.`,
    "",
    siteConfig.tagline,
    "",
    `Pick an aircraft and start practising: ${appUrl}/aircraft`,
    "",
    "Every answer you give while signed in is saved as you give it, so a",
    "test you don't finish still counts, and a refresh resumes rather than",
    "restarts. /progress tracks your score by topic as you go.",
  ].join("\n");

  const html = emailShell(
    [
      `<p>Welcome to ${escapeHtml(siteConfig.name)}.</p>`,
      `<p style="color:#64748b;">${escapeHtml(siteConfig.tagline)}</p>`,
      emailButton("Pick an aircraft", `${appUrl}/aircraft`),
      `<p style="color:#64748b;font-size:13px;">Every answer you give while signed in is saved as you give it, so a test you don't finish still counts, and a refresh resumes rather than restarts. <a href="${escapeHtml(appUrl)}/progress" style="color:#0e7490;">Your progress</a> tracks your score by topic as you go.</p>`,
    ].join("\n"),
    { preheader: siteConfig.tagline },
  );

  return {
    to,
    subject: `Welcome to ${siteConfig.name}`,
    text,
    html,
  };
}
