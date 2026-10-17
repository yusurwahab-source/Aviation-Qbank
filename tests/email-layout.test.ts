import { describe, expect, it } from "vitest";

import { EMAIL_LOGO_URL, renderEmail } from "@/lib/email/layout";
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
