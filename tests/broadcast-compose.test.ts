import { describe, expect, it } from "vitest";

import { composeBroadcastEmail, broadcastInputSchema } from "@/lib/broadcast/compose";

const base = { to: "a@b.co", subject: "Hello", body: "Line one\n\nLine two", unsubscribeUrl: "https://x.test/unsubscribe?token=abc" };

describe("composeBroadcastEmail", () => {
  it("always ends with why they are receiving it and how to stop", () => {
    const message = composeBroadcastEmail(base);
    expect(message.text).toContain("You are receiving this because you have an account");
    expect(message.text).toContain(base.unsubscribeUrl);
    expect(message.html).toContain(`href="${base.unsubscribeUrl}"`);
  });

  it("sets a List-Unsubscribe header, pointing at the page when there is no one-click endpoint", () => {
    expect(composeBroadcastEmail(base).headers).toEqual({ "List-Unsubscribe": `<${base.unsubscribeUrl}>` });
  });

  it("offers one-click unsubscribe when given an endpoint for it", () => {
    const message = composeBroadcastEmail({ ...base, oneClickUrl: "https://x.test/api/unsubscribe?token=abc" });
    expect(message.headers).toEqual({
      "List-Unsubscribe": "<https://x.test/api/unsubscribe?token=abc>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("keeps the owner's text as written in the plain version", () => {
    expect(composeBroadcastEmail(base).text.startsWith("Line one\n\nLine two")).toBe(true);
  });

  it("turns blank lines into paragraphs and single breaks into <br>", () => {
    const html = composeBroadcastEmail({ ...base, body: "a\nb\n\nc" }).html!;
    expect(html).toContain("<p>a<br>b</p>");
    expect(html).toContain("<p>c</p>");
  });

  it("never lets the body inject markup", () => {
    const html = composeBroadcastEmail({ ...base, body: '<script>alert(1)</script> "quoted"' }).html!;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;quoted&quot;");
  });

  it("makes plain web addresses clickable, and only those", () => {
    const html = composeBroadcastEmail({ ...base, body: "See https://example.com/page?a=1&b=2 now" }).html!;
    expect(html).toContain('<a href="https://example.com/page?a=1&amp;b=2">https://example.com/page?a=1&amp;b=2</a>');
    expect(composeBroadcastEmail({ ...base, body: "javascript:alert(1)" }).html).not.toContain("<a href=\"javascript");
  });
});

describe("broadcastInputSchema", () => {
  const ok = { subject: "Hi", body: "Text", audience: "everyone", onlyConfirmed: true };

  it("accepts a normal message", () => {
    expect(broadcastInputSchema.safeParse(ok).success).toBe(true);
  });

  it("refuses an empty subject or body", () => {
    expect(broadcastInputSchema.safeParse({ ...ok, subject: "  " }).success).toBe(false);
    expect(broadcastInputSchema.safeParse({ ...ok, body: "" }).success).toBe(false);
  });

  it("refuses a subject with a line break", () => {
    expect(broadcastInputSchema.safeParse({ ...ok, subject: "a\nBcc: x@y.z" }).success).toBe(false);
  });

  it("refuses an audience that does not exist", () => {
    expect(broadcastInputSchema.safeParse({ ...ok, audience: "admins" }).success).toBe(false);
  });
});
