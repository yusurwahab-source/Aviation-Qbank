import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import { contactWidgetHidden, whatsappHref } from "@/lib/contact-links";

describe("whatsappHref", () => {
  it("keeps digits only", () => {
    expect(whatsappHref("+32 485 12 32 99")).toBe("https://wa.me/32485123299");
  });

  it("encodes a prefilled message", () => {
    expect(whatsappHref("32485123299", "Hello & hi")).toBe(
      "https://wa.me/32485123299?text=Hello%20%26%20hi",
    );
  });

  it("the configured number is international, without a leading zero", () => {
    expect(siteConfig.whatsapp.number).toMatch(/^[1-9]\d{7,14}$/);
  });
});

describe("contactWidgetHidden", () => {
  it.each(["/contact", "/owner", "/owner/mail", "/pilot-sims/holding", "/type-rating/B737/test", "/flying-knowledge/MET/test"])(
    "hides on %s",
    (path) => expect(contactWidgetHidden(path)).toBe(true),
  );
  it.each(["/", "/about", "/pricing", "/type-rating", "/type-rating/B737", "/pilot-sims"])(
    "shows on %s",
    (path) => expect(contactWidgetHidden(path)).toBe(false),
  );
});
