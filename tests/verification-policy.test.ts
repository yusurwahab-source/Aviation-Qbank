import { describe, expect, it } from "vitest";

import {
  VERIFICATION_TOKEN_LIFETIME_MS,
  verificationExpiryFrom,
  verificationTokenState,
} from "@/lib/auth/verification-policy";
import { verificationEmail } from "@/lib/email/verification-email";

describe("verification link rules", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("lasts a day from issue", () => {
    expect(verificationExpiryFrom(now).getTime() - now.getTime()).toBe(VERIFICATION_TOKEN_LIFETIME_MS);
    expect(VERIFICATION_TOKEN_LIFETIME_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("tells valid, expired, used and unknown apart", () => {
    const future = new Date(now.getTime() + 1000);
    const past = new Date(now.getTime() - 1000);

    expect(verificationTokenState({ expiresAt: future, usedAt: null }, now)).toBe("valid");
    expect(verificationTokenState({ expiresAt: past, usedAt: null }, now)).toBe("expired");
    expect(verificationTokenState({ expiresAt: future, usedAt: past }, now)).toBe("used");
    expect(verificationTokenState({ expiresAt: past, usedAt: past }, now)).toBe("used");
    expect(verificationTokenState(null, now)).toBe("unknown");
  });
});

describe("verificationEmail", () => {
  const message = verificationEmail("a@b.co", "https://example.com/verify-email?token=abc");

  it("carries the link and says ignoring it is enough", () => {
    expect(message.to).toBe("a@b.co");
    expect(message.text).toContain("https://example.com/verify-email?token=abc");
    expect(message.text).toContain("you can ignore this email");
  });

  it("states how long the link lasts", () => {
    expect(message.text).toContain("24 hours");
  });

  it("escapes the link in the HTML version", () => {
    const hostile = verificationEmail("a@b.co", 'https://x.test/?a="1"&b=<2>');
    expect(hostile.html).toContain("&quot;1&quot;");
    expect(hostile.html).toContain("&lt;2&gt;");
  });
});
