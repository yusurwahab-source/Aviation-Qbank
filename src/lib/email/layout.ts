import { siteConfig } from "@/config/site";

/**
 * The frame every PilotQBank email is sent in: a navy header carrying the
 * logo mark, a white card with the message, and a footer with a way to reach
 * us. Pure — strings in, strings out — so the wording and the escaping are
 * asserted in tests rather than trusted.
 *
 * Two rules the markup follows, because mail clients are not browsers:
 *
 * - **Tables and inline styles.** Outlook and several webmails ignore
 *   `<style>` blocks and modern layout. Nothing here relies on either.
 * - **Colours are hex, written here by hand.** An email cannot read the CSS
 *   custom properties in `globals.css`, the same reason `manifest.ts` and the
 *   social card carry their own copies — change them with the palette.
 *
 * The plain-text version is built from the same spec and is the authoritative
 * one: it carries every link in full, so a client that strips HTML loses
 * decoration and nothing else.
 */

const COLOR = {
  navy: "#0A1120",
  accent: "#F5C542",
  onAccent: "#0A1120",
  ink: "#212529",
  muted: "#5C6670",
  page: "#F1F3F5",
  card: "#FFFFFF",
  rule: "#E3E6EA",
} as const;

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";

/** The mark is served from this site's own `public/` folder. */
export const EMAIL_LOGO_URL = `${siteConfig.url}/icon-192.png`;

export const EMAIL_SIGN_OFF = ["Safe flying,", `The ${siteConfig.name} team`] as const;

export type EmailLayoutSpec = {
  /** The grey line a mail list shows beside the subject. Not shown in the body. */
  preheader: string;
  heading: string;
  /** "Hello," — the welcome line. Omit when the sender writes their own. */
  greeting?: string;
  /** Whether to close with the team sign-off. Defaults to true. */
  signOff?: boolean;
  /** Plain-text paragraphs, escaped for the HTML version. */
  paragraphs: string[];
  /** The one thing to do. Its URL is also printed in the plain-text version. */
  button?: { label: string; url: string };
  /** Paragraphs after the button. */
  afterButton?: string[];
  /** A smaller, quieter line — "if this was not you…". */
  note?: string;
  /** Facts about the event, shown as a small table: account, time, expiry. */
  details?: Array<{ label: string; value: string }>;
  /**
   * Replaces `paragraphs` in the HTML version only, for content that is
   * already escaped (the owner's broadcast text). Never put user input here
   * without running it through `escapeHtml` first.
   */
  bodyHtml?: string;
  /** Extra footer line, e.g. the unsubscribe notice on a broadcast. */
  footerNote?: { text: string; html: string };
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmail(spec: EmailLayoutSpec): { text: string; html: string } {
  return { text: renderText(spec), html: renderHtml(spec) };
}

function renderText(spec: EmailLayoutSpec): string {
  const lines: string[] = spec.greeting ? [spec.greeting, ""] : [];
  for (const paragraph of spec.paragraphs) lines.push(paragraph, "");
  if (spec.button) lines.push(`${spec.button.label}:`, spec.button.url, "");
  for (const paragraph of spec.afterButton ?? []) lines.push(paragraph, "");
  if (spec.details?.length) {
    for (const { label, value } of spec.details) lines.push(`${label}: ${value}`);
    lines.push("");
  }
  if (spec.note) lines.push(spec.note, "");
  if (spec.signOff !== false) lines.push(...EMAIL_SIGN_OFF, "");
  lines.push("—", siteConfig.tagline, `${siteConfig.url}  ·  Contact us: ${siteConfig.url}/contact`);
  if (spec.footerNote) lines.push("", spec.footerNote.text);
  return lines.join("\n");
}

function renderHtml(spec: EmailLayoutSpec): string {
  const p = (text: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${COLOR.ink}">${escapeHtml(text)}</p>`;

  const body = spec.bodyHtml ?? spec.paragraphs.map(p).join("\n");

  const button = spec.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr>
<td style="background:${COLOR.accent};border-radius:8px">
<a href="${escapeHtml(spec.button.url)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:700;color:${COLOR.onAccent};text-decoration:none;border-radius:8px">${escapeHtml(spec.button.label)}</a>
</td></tr></table>
<p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:${COLOR.muted}">Button not working? Copy this address into your browser:<br><a href="${escapeHtml(spec.button.url)}" style="color:${COLOR.muted};word-break:break-all">${escapeHtml(spec.button.url)}</a></p>`
    : "";

  const after = (spec.afterButton ?? []).map(p).join("\n");

  const details = spec.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid ${COLOR.rule};border-radius:8px;border-collapse:separate">${spec.details
        .map(
          ({ label, value }, index) =>
            `<tr><td style="padding:10px 14px;font-size:13px;color:${COLOR.muted};white-space:nowrap;${index > 0 ? `border-top:1px solid ${COLOR.rule};` : ""}">${escapeHtml(label)}</td><td style="padding:10px 14px;font-size:14px;color:${COLOR.ink};font-weight:600;${index > 0 ? `border-top:1px solid ${COLOR.rule};` : ""}">${escapeHtml(value)}</td></tr>`,
        )
        .join("")}</table>`
    : "";

  const note = spec.note
    ? `<p style="margin:0 0 24px;padding:14px 16px;background:${COLOR.page};border-radius:8px;font-size:14px;line-height:1.5;color:${COLOR.muted}">${escapeHtml(spec.note)}</p>`
    : "";

  const signOff =
    spec.signOff === false
      ? ""
      : `<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${COLOR.ink}">${escapeHtml(EMAIL_SIGN_OFF[0])}<br><strong>${escapeHtml(EMAIL_SIGN_OFF[1])}</strong></p>`;

  const footerNote = spec.footerNote
    ? `<p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:${COLOR.muted}">${spec.footerNote.html}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(spec.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(spec.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.page}">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;font-family:${FONT}">
<tr><td style="background:${COLOR.navy};padding:20px 28px;border-radius:12px 12px 0 0">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:14px"><img src="${EMAIL_LOGO_URL}" width="48" height="48" alt="${escapeHtml(siteConfig.name)}" style="display:block;border:0;border-radius:10px"></td>
<td style="font-family:${FONT};font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:0.2px">${escapeHtml(siteConfig.name)}</td>
</tr></table>
</td></tr>
<tr><td style="height:4px;line-height:4px;font-size:0;background:${COLOR.accent}">&nbsp;</td></tr>
<tr><td style="background:${COLOR.card};padding:32px 28px 8px">
<h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:${COLOR.navy}">${escapeHtml(spec.heading)}</h1>
${spec.greeting ? p(spec.greeting) : ""}
${body}
${button}
${after}
${details}
${note}
${signOff}
</td></tr>
<tr><td style="background:${COLOR.card};padding:0 28px"><div style="border-top:1px solid ${COLOR.rule};line-height:1px;font-size:1px">&nbsp;</div></td></tr>
<tr><td style="background:${COLOR.card};padding:20px 28px 28px;border-radius:0 0 12px 12px">
<p style="margin:0;font-size:13px;line-height:1.5;color:${COLOR.muted}"><strong style="color:${COLOR.navy}">${escapeHtml(siteConfig.name)}</strong> — ${escapeHtml(siteConfig.tagline)}</p>
<p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:${COLOR.muted}"><a href="${escapeHtml(siteConfig.url)}" style="color:${COLOR.muted}">${escapeHtml(siteConfig.url.replace("https://", ""))}</a> &nbsp;·&nbsp; <a href="${escapeHtml(siteConfig.url)}/contact" style="color:${COLOR.muted}">Contact us</a></p>
${footerNote}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** "17 Oct 2026, 23:32 UTC" — unambiguous across time zones, which a security notice has to be. */
export function formatEmailTime(at: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const two = (n: number) => String(n).padStart(2, "0");
  return `${at.getUTCDate()} ${months[at.getUTCMonth()]} ${at.getUTCFullYear()}, ${two(at.getUTCHours())}:${two(at.getUTCMinutes())} UTC`;
}
