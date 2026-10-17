import "server-only";

import { envValue } from "@/lib/env";

/**
 * Sending email.
 *
 * One function, and a choice of two ways to carry out the send, decided by
 * what is configured rather than by an import. That is the whole design: the
 * reset flow does not know or care which is in use, so the provider can be
 * changed by editing this file alone.
 *
 * **Resend** when `RESEND_API_KEY` and `EMAIL_FROM` are both set. One HTTPS
 * call with `fetch`, so no dependency is added — the SDK would only wrap the
 * request below.
 *
 * **The server log** otherwise. This is not a stub that quietly does nothing:
 * it prints the whole message, link included, where whoever is running the
 * app can see it. A fresh clone therefore has a working password reset with
 * no account anywhere and no keys to obtain — you read the link out of the
 * terminal. The deployed site is what needs a real provider, and it says so
 * loudly if it is missing one.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  /** Plain text. Always sent, and always the authoritative version. */
  text: string;
  /** Optional HTML alternative. */
  html?: string;
  /** Extra headers, e.g. `List-Unsubscribe` on a broadcast. */
  headers?: Record<string, string>;
};

export type EmailOutcome = {
  /** Whether the message reached a mail provider. */
  delivered: boolean;
  /** Which route was taken, for logging and for tests. */
  via: "resend" | "log";
  /** Present when delivery failed. Never shown to a user. */
  error?: string;
};

/**
 * Where links in emails should point.
 *
 * Explicit `APP_URL` first, because it is the only one that is certainly
 * right. Vercel sets `VERCEL_PROJECT_PRODUCTION_URL` to the stable production
 * domain, which is the correct fallback — `VERCEL_URL` names the individual
 * deployment, so a link built from it would point at a frozen preview rather
 * than at the live site.
 */
export function appUrl(): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

/** Whether a real provider is configured, for the setup notice on screen. */
export function emailIsConfigured(): boolean {
  return envValue("RESEND_API_KEY") !== null && envValue("EMAIL_FROM") !== null;
}

/**
 * Sends a message, and never throws.
 *
 * A caller that is deciding what to show a user must not have its own failure
 * handling for this: whether the mail went out is not the user's business and
 * must not change what they are told. So every failure is caught here, logged
 * for the operator, and reported in the return value.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailOutcome> {
  const apiKey = envValue("RESEND_API_KEY");
  const from = envValue("EMAIL_FROM");

  if (!apiKey || !from) {
    // Deliberately the full message. The link is the point.
    console.info(
      [
        "",
        "──────────── email (no provider configured, so not sent) ────────────",
        `To:      ${message.to}`,
        `Subject: ${message.subject}`,
        "",
        message.text,
        "─────────────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { delivered: false, via: "log" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
        ...(message.headers ? { headers: message.headers } : {}),
      }),
    });

    if (!response.ok) {
      // The body can name the address it refused. Logged for the operator,
      // never returned to the browser.
      const detail = await response.text().catch(() => "");
      console.error(`Email send failed: ${response.status} ${detail.slice(0, 500)}`);
      return { delivered: false, via: "resend", error: `${response.status}` };
    }

    return { delivered: true, via: "resend" };
  } catch (error) {
    console.error("Email send threw:", error);
    return { delivered: false, via: "resend", error: (error as Error).message };
  }
}
