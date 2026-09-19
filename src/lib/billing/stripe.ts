/**
 * Starting a Stripe Checkout session.
 *
 * No `stripe` package is installed — one HTTPS call with `fetch`, the same
 * reasoning as `sendEmail`'s Resend call: the SDK would only wrap the
 * request below. The two plans are Prices created once in the Stripe
 * dashboard, each already carrying its own amount and interval; a price
 * change is an edit there, never a deploy here.
 */

const STRIPE_API_BASE = "https://api.stripe.com/v1";

export const CHECKOUT_PLANS = ["monthly", "quarterly"] as const;
export type CheckoutPlan = (typeof CHECKOUT_PLANS)[number];

/** Narrows an unknown value to a `CheckoutPlan`, or null if it isn't one. */
export function parseCheckoutPlan(value: unknown): CheckoutPlan | null {
  return typeof value === "string" && (CHECKOUT_PLANS as readonly string[]).includes(value)
    ? (value as CheckoutPlan)
    : null;
}

/**
 * Whether a configured value is even shaped like the thing it claims to be.
 *
 * This is a *misconfiguration* check, not a security one — only Stripe can
 * say whether a key is real. It exists so a value that could never work is
 * caught before it is sent, and the screen says "not configured" rather than
 * rendering a button whose only outcome is the provider's own error.
 */
/**
 * `rk_` is accepted alongside `sk_` deliberately. A restricted key is the
 * better thing to deploy: this app only ever asks Stripe for one thing — a
 * Checkout Session — so the key it runs on needs no permission to read a
 * customer, refund a charge or create a price. Rejecting `rk_` would have
 * forced a full-access key into a hosting dashboard to buy nothing.
 */
export function looksLikeSecretKey(value: string | null): value is string {
  return value !== null && /^(sk|rk)_(test|live)_/.test(value);
}

export function looksLikePriceId(value: string | null): value is string {
  return value !== null && value.startsWith("price_");
}

/**
 * Stripe's `current_period_end` used to live on the Subscription object
 * itself. Under the account's "flexible billing" API behaviour it lives on
 * each line item instead (`subscription.items.data[0].current_period_end`),
 * one per item, because a subscription can now hold several independently
 * billed items — the top-level field is simply absent. This reads whichever
 * is present, preferring the top-level one so an older API version keeps
 * working unchanged, and falling back to the first item's for the shape this
 * account actually sends. There is only ever one item on any subscription
 * this app creates, so "the first item's period" and "the subscription's
 * period" are the same fact.
 */
export function extractCurrentPeriodEnd(subscription: {
  current_period_end?: unknown;
  items?: { data?: Array<{ current_period_end?: unknown }> };
}): number | null {
  if (typeof subscription.current_period_end === "number") {
    return subscription.current_period_end;
  }
  const fromFirstItem = subscription.items?.data?.[0]?.current_period_end;
  return typeof fromFirstItem === "number" ? fromFirstItem : null;
}

/**
 * The form-encoded body Stripe's Checkout Sessions API expects. Pure and
 * exported on its own so the shape of the request can be asserted without a
 * network call.
 *
 * `client_reference_id` and `subscription_data[metadata]` both carry the
 * signed-in user's id and the chosen plan back to us — the metadata is what
 * the webhook actually reads, because it is attached to the *subscription*
 * itself and so is still present on every later renewal or cancellation
 * event, long after the checkout session that created it is gone.
 */
export function buildCheckoutSessionBody(input: {
  priceId: string;
  plan: CheckoutPlan;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  email?: string;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][price]", input.priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  params.set("client_reference_id", input.userId);
  params.set("subscription_data[metadata][userId]", input.userId);
  params.set("subscription_data[metadata][plan]", input.plan);
  if (input.email) params.set("customer_email", input.email);
  return params;
}

export type CreateCheckoutSessionResult =
  | { status: "created"; url: string }
  | { status: "failed"; error: string };

/**
 * Calls Stripe and returns the hosted page to send the student to. No card
 * details, and nothing about the card, ever reach this server — Stripe hosts
 * the page and is responsible for PCI compliance on it.
 */
export async function createCheckoutSession(input: {
  secretKey: string;
  priceId: string;
  plan: CheckoutPlan;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  email?: string;
}): Promise<CreateCheckoutSessionResult> {
  const body = buildCheckoutSessionBody(input);

  let response: Response;
  try {
    response = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
  } catch {
    return { status: "failed", error: "Could not reach Stripe. Check your connection and try again." };
  }

  const data = (await response.json().catch(() => null)) as
    | { url?: string; error?: { message?: string } }
    | null;

  if (!response.ok || !data?.url) {
    return { status: "failed", error: data?.error?.message ?? "Stripe could not start checkout." };
  }

  return { status: "created", url: data.url };
}
