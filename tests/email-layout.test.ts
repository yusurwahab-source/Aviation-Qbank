import { describe, expect, it } from "vitest";

import { EMAIL_LOGO_URL, formatEmailTime, renderEmail } from "@/lib/email/layout";
import { passwordChangedEmail } from "@/lib/email/password-changed-email";
import { resetEmail } from "@/lib/email/reset-email";
import { verificationEmail } from "@/lib/email/verification-email";

describe("renderEmail", () => {
  const spec = {
    preheader: "Pre",
    heading: "Head <b>",
    greeting: "Hello,",
    paragraphs: ["One & two"],
    button: { label: "Go", url: "https://x.test/a?b=1&c=\"2\"" },
    note: "Careful",
  };
  const { text, html } = renderEmail(spec);

  it("carries the logo, a greeting, a sign-off and a way to reach us", () => {
    expect(html).toContain(`src="${EMAIL_LOGO_URL}"`);
    expect(html).toContain("Hello,");
    expect(html).toContain("Safe flying,");
    expect(html).toContain("/contact");
    expect(text).toContain("Safe flying,");
  });

  it("escapes everything it is given", () => {
    expect(html).toContain("Head &lt;b&gt;");
    expect(html).toContain("One &amp; two");
    expect(html).toContain("&quot;2&quot;");
    expect(html).not.toContain("<b>");
  });

  it("prints the button's address in full in the plain-text version", () => {
    expect(text).toContain(spec.button.url);
  });
});

describe("branded messages", () => {
  it("reset and verification emails are framed and welcoming", () => {
    const reset = resetEmail("a@b.co", "https://x.test/r");
    const verify = verificationEmail("a@b.co", "https://x.test/v");
    expect(reset.html).toContain(EMAIL_LOGO_URL);
    expect(reset.text).toContain("https://x.test/r");
    expect(verify.text).toContain("Welcome aboard");
    expect(verify.html).toContain("Confirm my email");
  });
});

describe("security emails", () => {
  const at = new Date("2026-10-17T23:32:06Z");

  it("formats the time in UTC, unambiguously", () => {
    expect(formatEmailTime(at)).toBe("17 Oct 2026, 23:32 UTC");
  });

  it("the reset email names the account, when it was asked and how long the link lives", () => {
    const message = resetEmail("a@b.co", "https://x.test/r", at);
    for (const part of ["Account: a@b.co", "Requested: 17 Oct 2026, 23:32 UTC", "Link valid for: one hour, one use"]) {
      expect(message.text).toContain(part);
    }
    expect(message.html).toContain("17 Oct 2026, 23:32 UTC");
    expect(message.text).toContain("Never share this link");
  });

  it("the password-changed email says what changed, when, and offers a way to secure the account", () => {
    const message = passwordChangedEmail("a@b.co", "https://x.test/forgot-password", at);
    expect(message.text).toContain("Changed: 17 Oct 2026, 23:32 UTC");
    expect(message.text).toContain("Other devices: Signed out");
    expect(message.html).toContain("Secure my account");
    expect(message.text).toContain("We will never ask for your password by email");
  });

  it("escapes an account address in the details table", () => {
    const message = passwordChangedEmail('"><script>@x.co', "https://x.test/f", at);
    expect(message.html).not.toContain("<script>");
  });
});
