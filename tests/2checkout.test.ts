import { describe, expect, it } from "vitest";

import {
  buildCheckoutUrl,
  buildOrderExtRef,
  parseOrderExtRef,
} from "@/lib/billing/2checkout";

describe("buildOrderExtRef / parseOrderExtRef", () => {
  it("round-trips a user id and plan", () => {
    const ref = buildOrderExtRef("a1b2c3", "yearly");
    expect(parseOrderExtRef(ref)).toEqual({ userId: "a1b2c3", plan: "yearly" });
  });

  it("rejects anything that isn't one of ours", () => {
    expect(parseOrderExtRef("not-one-of-ours")).toBeNull();
    expect(parseOrderExtRef("")).toBeNull();
    expect(parseOrderExtRef("user:not-a-plan")).toBeNull();
    expect(parseOrderExtRef(":monthly")).toBeNull();
  });
});

describe("buildCheckoutUrl", () => {
  it("builds a ConvertPlus link with the required parameters", () => {
    const url = new URL(
      buildCheckoutUrl({
        merchantCode: "MERCHANT123",
        productId: "PROD-MONTHLY",
        orderExtRef: "user-1:monthly",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://secure.2checkout.com/checkout/buy");
    expect(url.searchParams.get("merchant")).toBe("MERCHANT123");
    expect(url.searchParams.get("prod")).toBe("PROD-MONTHLY");
    expect(url.searchParams.get("order-ext-ref")).toBe("user-1:monthly");
    expect(url.searchParams.has("test")).toBe(false);
  });

  it("includes the optional parameters only when given", () => {
    const url = new URL(
      buildCheckoutUrl({
        merchantCode: "M",
        productId: "P",
        orderExtRef: "R",
        email: "student@example.com",
        returnUrl: "https://example.com/upgrade/thanks",
        sandbox: true,
      }),
    );
    expect(url.searchParams.get("email")).toBe("student@example.com");
    expect(url.searchParams.get("return-url")).toBe("https://example.com/upgrade/thanks");
    expect(url.searchParams.get("test")).toBe("1");
  });
});
