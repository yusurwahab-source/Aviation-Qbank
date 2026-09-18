import { describe, expect, it } from "vitest";

import {
  buildCheckoutSessionBody,
  looksLikePriceId,
  looksLikeSecretKey,
  parseCheckoutPlan,
} from "@/lib/billing/stripe";

describe("parseCheckoutPlan", () => {
  it("accepts the two known plans", () => {
    expect(parseCheckoutPlan("monthly")).toBe("monthly");
    expect(parseCheckoutPlan("quarterly")).toBe("quarterly");
  });

  it("rejects anything else", () => {
    expect(parseCheckoutPlan("weekly")).toBeNull();
    expect(parseCheckoutPlan("")).toBeNull();
    expect(parseCheckoutPlan(undefined)).toBeNull();
    expect(parseCheckoutPlan(null)).toBeNull();
    expect(parseCheckoutPlan(42)).toBeNull();
  });
});

describe("looksLikeSecretKey", () => {
  it("accepts a test or live secret key", () => {
    expect(looksLikeSecretKey("sk_test_abc123")).toBe(true);
    expect(looksLikeSecretKey("sk_live_abc123")).toBe(true);
  });

  it("rejects the variable name pasted in place of the key", () => {
    // The exact misconfiguration this guard exists for.
    expect(looksLikeSecretKey("STRIPE_SECRET_KEY=sk_test_abc123")).toBe(false);
  });

  it("rejects anything else", () => {
    expect(looksLikeSecretKey(null)).toBe(false);
    expect(looksLikeSecretKey("")).toBe(false);
    expect(looksLikeSecretKey("pk_test_abc123")).toBe(false);
    expect(looksLikeSecretKey("whsec_abc123")).toBe(false);
  });
});

describe("looksLikePriceId", () => {
  it("accepts a price id", () => {
    expect(looksLikePriceId("price_1UH8wbE9")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(looksLikePriceId(null)).toBe(false);
    expect(looksLikePriceId("")).toBe(false);
    expect(looksLikePriceId("prod_1UH8wbE9")).toBe(false);
    expect(looksLikePriceId("STRIPE_MONTHLY_PRICE_ID=price_1UH8wbE9")).toBe(false);
  });
});

describe("buildCheckoutSessionBody", () => {
  it("builds a subscription-mode session for the chosen price", () => {
    const body = buildCheckoutSessionBody({
      priceId: "price_123",
      plan: "monthly",
      userId: "user-1",
      successUrl: "https://example.com/upgrade?success=1",
      cancelUrl: "https://example.com/upgrade",
    });

    expect(body.get("mode")).toBe("subscription");
    expect(body.get("line_items[0][price]")).toBe("price_123");
    expect(body.get("line_items[0][quantity]")).toBe("1");
    expect(body.get("success_url")).toBe("https://example.com/upgrade?success=1");
    expect(body.get("cancel_url")).toBe("https://example.com/upgrade");
  });

  it("carries the user id and plan as subscription metadata, not only as client_reference_id", () => {
    const body = buildCheckoutSessionBody({
      priceId: "price_123",
      plan: "quarterly",
      userId: "user-42",
      successUrl: "https://example.com/upgrade",
      cancelUrl: "https://example.com/upgrade",
    });

    // client_reference_id lives on the Session, which the webhook never sees
    // again after checkout — the metadata is what a renewal or cancellation
    // event years later still carries.
    expect(body.get("client_reference_id")).toBe("user-42");
    expect(body.get("subscription_data[metadata][userId]")).toBe("user-42");
    expect(body.get("subscription_data[metadata][plan]")).toBe("quarterly");
  });

  it("includes the email only when given", () => {
    const withEmail = buildCheckoutSessionBody({
      priceId: "price_123",
      plan: "monthly",
      userId: "user-1",
      successUrl: "https://example.com/upgrade",
      cancelUrl: "https://example.com/upgrade",
      email: "student@example.com",
    });
    expect(withEmail.get("customer_email")).toBe("student@example.com");

    const withoutEmail = buildCheckoutSessionBody({
      priceId: "price_123",
      plan: "monthly",
      userId: "user-1",
      successUrl: "https://example.com/upgrade",
      cancelUrl: "https://example.com/upgrade",
    });
    expect(withoutEmail.has("customer_email")).toBe(false);
  });
});
