import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { MAX_MAIL_BODY, ownerMailEmail, ownerMailSchema } from "@/lib/mail/compose";
import { MAX_STORED_BODY, parseAddress, plainTextFromHtml, receivedEventSchema, replySubject, storedBody } from "@/lib/mail/parse";
import { SVIX_TOLERANCE_SECONDS, verifySvixSignature } from "@/lib/mail/svix";

const secretBytes = Buffer.from("super-secret-key-material");
const secret = `whsec_${secretBytes.toString("base64")}`;
const now = 1_800_000_000_000;

function sign(id: string, timestamp: string, body: string, key = secretBytes) {
  return `v1,${createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64")}`;
}

describe("verifySvixSignature", () => {
  const body = '{"type":"email.received"}';
  const ts = String(now / 1000);
  const base = { id: "msg_1", timestamp: ts, body, secret, now };

  it("accepts a correctly signed request", () => {
    expect(verifySvixSignature({ ...base, signature: sign("msg_1", ts, body) }).valid).toBe(true);
  });

  it("accepts when any of several signatures matches (secret rotation)", () => {
    const header = `v1,AAAA ${sign("msg_1", ts, body)}`;
    expect(verifySvixSignature({ ...base, signature: header }).valid).toBe(true);
  });

  it("rejects a changed body, a wrong secret and a wrong id", () => {
    expect(verifySvixSignature({ ...base, body: body + " ", signature: sign("msg_1", ts, body) }).valid).toBe(false);
    expect(verifySvixSignature({ ...base, signature: sign("msg_1", ts, body, Buffer.from("other")) }).valid).toBe(false);
    expect(verifySvixSignature({ ...base, id: "msg_2", signature: sign("msg_1", ts, body) }).valid).toBe(false);
  });

  it("rejects a replay outside the tolerance", () => {
    const old = String(now / 1000 - SVIX_TOLERANCE_SECONDS - 1);
    expect(verifySvixSignature({ ...base, timestamp: old, signature: sign("msg_1", old, body) })).toEqual({
      valid: false,
      reason: "timestamp outside tolerance",
    });
  });

  it("rejects missing headers and non-v1 signatures", () => {
    expect(verifySvixSignature({ ...base, id: null, signature: "v1,x" }).valid).toBe(false);
    expect(verifySvixSignature({ ...base, signature: null }).valid).toBe(false);
    expect(verifySvixSignature({ ...base, signature: sign("msg_1", ts, body).replace("v1", "v2") }).valid).toBe(false);
  });
});

describe("parsing a received message", () => {
  it("splits a name from an address and lowercases the address", () => {
    expect(parseAddress('"Ada L." <Ada@X.org>')).toEqual({ name: "Ada L.", address: "ada@x.org" });
    expect(parseAddress("Bob@Y.co")).toEqual({ name: null, address: "bob@y.co" });
  });

  it("reads the webhook event and ignores unknown fields", () => {
    const parsed = receivedEventSchema.safeParse({
      type: "email.received",
      data: { email_id: "abc", from: "a@b.co", to: ["support@x.com"], subject: "Hi", extra: 1 },
    });
    expect(parsed.success).toBe(true);
    expect(receivedEventSchema.safeParse({ type: "email.received", data: {} }).success).toBe(false);
  });

  it("turns HTML into readable text and never keeps markup", () => {
    const text = plainTextFromHtml('<p>Hello &amp; welcome</p><script>alert(1)</script><div>Line<br>two</div>');
    expect(text).toBe("Hello & welcome\nLine\ntwo");
    expect(text).not.toContain("<");
  });

  it("prefers the plain text, falls back to HTML, and bounds the size", () => {
    expect(storedBody("plain", "<p>html</p>")).toBe("plain");
    expect(storedBody("", "<p>html</p>")).toBe("html");
    expect(storedBody(null, null)).toBe("(no text)");
    expect(storedBody("x".repeat(MAX_STORED_BODY + 10), null)).toHaveLength(MAX_STORED_BODY);
  });

  it("does not stack Re: prefixes", () => {
    expect(replySubject("Question")).toBe("Re: Question");
    expect(replySubject("re: Question")).toBe("re: Question");
  });
});

describe("the owner's outgoing mail", () => {
  it("validates the address, subject and body", () => {
    expect(ownerMailSchema.safeParse({ to: "a@b.co", subject: "Hi", body: "Hello" }).success).toBe(true);
    expect(ownerMailSchema.safeParse({ to: "nope", subject: "Hi", body: "Hello" }).success).toBe(false);
    expect(ownerMailSchema.safeParse({ to: "a@b.co", subject: "Hi\nBcc: x@y.z", body: "Hello" }).success).toBe(false);
    expect(ownerMailSchema.safeParse({ to: "a@b.co", subject: "Hi", body: "x".repeat(MAX_MAIL_BODY + 1) }).success).toBe(false);
  });

  it("keeps the owner's text, escapes the HTML and carries from and reply-to", () => {
    const message = ownerMailEmail({
      to: "a@b.co",
      subject: "Hi <b>",
      body: "One & two\n\nThree <script>",
      from: "PilotQBank Support <support@x.com>",
      replyTo: "support@x.com",
    });
    expect(message.text).toBe("One & two\n\nThree <script>");
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("One &amp; two");
    expect(message.from).toBe("PilotQBank Support <support@x.com>");
    expect(message.replyTo).toBe("support@x.com");
  });
});
