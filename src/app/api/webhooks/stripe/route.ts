import "server-only";

import { findSubscriptionByProviderRef, upsertSubscription } from "@/db/subscriptions";
import { extractCurrentPeriodEnd, parseCheckoutPlan } from "@/lib/billing/stripe";
import { verifyStripeSignature } from "@/lib/billing/stripe-webhook";
import { mapStripeSubscriptionStatus } from "@/lib/billing/access-policy";
import { envValue } from "@/lib/env";

/**
 * Where Stripe tells this app that a subscription changed.
 *
 * This is the one place outside Stripe's own dashboard that can turn a
 * subscription on, so nothing here is acted on until `verifyStripeSignature`
 * has confirmed the request was actually signed with this endpoint's own
 * secret. Anything that fails that check is answered and dropped, never
 * processed "just in case".
 *
 * Only the subscription's own events are handled — `checkout.session.completed`
 * is deliberately not one of them, because the subscription events carry
 * everything needed (`status`, a period end — see `extractCurrentPeriodEnd`
 * for where that actually lives — and the `userId`/`plan` metadata set at
 * checkout) and keep carrying it on every later renewal or cancellation, long
 * after the checkout session itself is gone.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = envValue("STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    console.error("Received a Stripe webhook but STRIPE_WEBHOOK_SECRET is not set.");
    return new Response("Not configured", { status: 500 });
  }

  const signatureHeader = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signatureHeader) {
    return new Response("Missing signature", { status: 401 });
  }

  const verification = verifyStripeSignature(rawBody, signatureHeader, secret);
  if (!verification.valid) {
    console.warn(`Stripe webhook signature check failed: ${verification.reason}`);
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.warn("Stripe webhook body was not valid JSON despite a valid signature.");
    return new Response("OK", { status: 200 });
  }

  const type = event.type;
  const subscription = event.data?.object;

  // Anything else (invoices, payment intents, customer events, …) is not
  // acted on — a 200 either way, since this genuinely was Stripe and there
  // is simply nothing for this app to do with it.
  if (
    !subscription ||
    (type !== "customer.subscription.created" &&
      type !== "customer.subscription.updated" &&
      type !== "customer.subscription.deleted")
  ) {
    return new Response("OK", { status: 200 });
  }

  const metadata = (subscription.metadata ?? {}) as Record<string, unknown>;
  let userId = typeof metadata.userId === "string" ? metadata.userId : null;
  let plan = parseCheckoutPlan(metadata.plan);
  const subscriptionRef = typeof subscription.id === "string" ? subscription.id : null;

  // A cancellation raised from Stripe's own customer portal can, in
  // principle, arrive without the metadata this app set at checkout —
  // fall back to the row already keyed by this subscription's own id.
  if ((!userId || !plan) && subscriptionRef) {
    const existing = await findSubscriptionByProviderRef(subscriptionRef);
    if (existing) {
      userId = existing.userId;
      plan = existing.plan;
    }
  }

  if (!userId || !plan) {
    console.warn(`Stripe ${type} event has no usable metadata:`, metadata);
    return new Response("OK", { status: 200 });
  }

  const status =
    type === "customer.subscription.deleted"
      ? "canceled"
      : mapStripeSubscriptionStatus(
          typeof subscription.status === "string" ? subscription.status : "",
        );

  const periodEndSeconds = extractCurrentPeriodEnd(
    subscription as { current_period_end?: unknown; items?: { data?: Array<{ current_period_end?: unknown }> } },
  );
  const currentPeriodEnd = periodEndSeconds !== null ? new Date(periodEndSeconds * 1000) : null;

  await upsertSubscription({
    userId,
    plan,
    status,
    provider: "stripe",
    providerSubscriptionRef: subscriptionRef,
    currentPeriodEnd: status === "active" ? currentPeriodEnd : null,
  });

  return new Response("OK", { status: 200 });
}
