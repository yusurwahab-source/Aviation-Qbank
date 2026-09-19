import { siteConfig } from "@/config/site";

/**
 * The HTML shell every transactional email is rendered inside.
 *
 * Email clients do not read `globals.css` — there is no way to point an
 * inbox at the design tokens the rest of the product uses, so the handful
 * of colours this needs are inlined here, copied from the dark theme's own
 * values in `globals.css` rather than invented separately. Table-based
 * layout and inline styles throughout, because that is still what actually
 * renders consistently in Outlook and Gmail; no external stylesheet, no
 * web font, nothing that depends on a request succeeding before the email
 * is readable.
 *
 * `sendEmail` in `send.ts` always sends the plain-text version alongside
 * this — this is the alternative, not the message.
 */

const COLORS = {
  background: "#080c14",
  accent: "#3ab7cc",
  onAccent: "#05121a",
} as const;

export function emailShell(bodyHtml: string, options: { preheader?: string } = {}): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(siteConfig.name)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${
      options.preheader
        ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</div>`
        : ""
    }
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:92%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background-color:${COLORS.background};padding:20px 28px;">
                <span style="font-size:18px;font-weight:700;color:${COLORS.accent};letter-spacing:-0.01em;">
                  ${escapeHtml(siteConfig.name)}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#1f2937;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background-color:#f9fafb;border-top:1px solid #e2e8f0;">
                <span style="font-size:12px;color:#94a3b8;">
                  ${escapeHtml(siteConfig.name)} — ${escapeHtml(siteConfig.tagline)}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** A solid accent button, styled to match the app's own `bg-brand` /
 * `text-on-solid` pairing — dark text on the accent fill, exactly as the
 * dark theme (the product's default) renders one. */
export function emailButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
  <tr>
    <td style="border-radius:8px;background-color:${COLORS.accent};">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:${COLORS.onAccent};text-decoration:none;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
