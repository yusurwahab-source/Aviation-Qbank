import { describe, expect, it } from "vitest";

import { RATE_LIMIT_RULES } from "@/lib/auth/rate-limit-policy";
import { contactEmail, contactSchema, MAX_MESSAGE_LENGTH } from "@/lib/contact";

const valid = {
  name: "Sam Pilot",
  email: "sam@example.com",
  topic: "wrong-question",
  questionId: "B737-ELEC-0042",
  message: "The explanation says the opposite of the answer.",
};

describe("contactSchema", () => {
  it("accepts a complete message and normalises the email", () => {
    const parsed = contactSchema.safeParse({ ...valid, email: "  Sam@Example.com " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("sam@example.com");
  });

  it("treats the question id as optional", () => {
    const { questionId, ...rest } = valid;
    void questionId;
    expect(contactSchema.safeParse(rest).success).toBe(true);
  });

  it("rejects a missing name, a bad email, an unknown topic and a short message", () => {
    expect(contactSchema.safeParse({ ...valid, name: "  " }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, topic: "spam" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, message: "hi" }).success).toBe(false);
  });

  it("rejects a message past the ceiling", () => {
    const tooLong = "x".repeat(MAX_MESSAGE_LENGTH + 1);
    expect(contactSchema.safeParse({ ...valid, message: tooLong }).success).toBe(false);
  });

  it("strips line breaks from a name so it cannot reach a header", () => {
    const parsed = contactSchema.safeParse({ ...valid, name: "Sam\r\nBcc: x@y.test" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.name).not.toMatch(/[\r\n]/);
  });
});

describe("contactEmail", () => {
  const input = contactSchema.parse(valid);

  it("goes to the owner and replies to the visitor", () => {
    const message = contactEmail("owner@example.com", input);
    expect(message.to).toBe("owner@example.com");
    expect(message.replyTo).toBe("sam@example.com");
  });

  it("carries the topic, the question id and the message", () => {
    const message = contactEmail("owner@example.com", input, { signedInAs: "sam@example.com" });
    expect(message.subject).toContain("A question I think is wrong");
    expect(message.text).toContain("B737-ELEC-0042");
    expect(message.text).toContain(input.message);
    expect(message.text).toContain("Signed in as: sam@example.com");
  });

  it("escapes visitor text in the HTML version", () => {
    const hostile = contactSchema.parse({ ...valid, message: '<script>alert("x")</script> hello there' });
    const message = contactEmail("owner@example.com", hostile);
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
  });
});

describe("contact rate limits", () => {
  it("are tighter per sender than the broad per-source brake is loose", () => {
    expect(RATE_LIMIT_RULES.contactPerEmail.maxFailures).toBeLessThanOrEqual(
      RATE_LIMIT_RULES.contactPerIp.maxFailures,
    );
    expect(RATE_LIMIT_RULES.contactPerEmail.windowMs).toBeGreaterThan(0);
  });
});
