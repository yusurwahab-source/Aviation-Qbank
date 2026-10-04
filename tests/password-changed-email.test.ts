import { describe, expect, it } from "vitest";

import { passwordChangedEmail } from "@/lib/email/password-changed-email";

describe("passwordChangedEmail", () => {
  const message = passwordChangedEmail("a@b.co", "https://example.com/forgot-password");

  it("is addressed to the account and names the product", () => {
    expect(message.to).toBe("a@b.co");
    expect(message.subject).toContain("password was changed");
  });

  it("says what happened and what to do if it was not them", () => {
    expect(message.text).toContain("was just changed");
    expect(message.text).toContain("If it was not you");
    expect(message.text).toContain("https://example.com/forgot-password");
  });

  it("never puts a password in the message", () => {
    expect(message.text.toLowerCase()).not.toMatch(/new password is|your password:/);
  });

  it("escapes the link in the HTML version", () => {
    const hostile = passwordChangedEmail("a@b.co", 'https://x.test/?a="1"&b=<2>');
    expect(hostile.html).not.toContain('"1"');
    expect(hostile.html).toContain("&quot;1&quot;");
    expect(hostile.html).toContain("&lt;2&gt;");
  });
});
