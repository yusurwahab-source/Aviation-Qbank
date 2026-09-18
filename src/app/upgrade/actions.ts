"use server";

import { redirect } from "next/navigation";

import {
  createCheckoutSession,
  looksLikePriceId,
  looksLikeSecretKey,
  parseCheckoutPlan,
} from "@/lib/billing/stripe";
import { getCurrentUser } from "@/lib/auth/session";
import { appUrl } from "@/lib/email/send";
import { envValue } from "@/lib/env";

export type CheckoutState = { error?: string };

/** Which env var names a plan's Stripe Price, keyed the same way as the plan itself. */
const PRICE_ID_ENV_VAR = {
  monthly: "STRIPE_MONTHLY_PRICE_ID",
  quarterly: "STRIPE_QUARTERLY_PRICE_ID",
} as const;

const NOT_CONFIGURED = "Payments are not configured on this deployment yet.";

/**
 * Starts a Stripe Checkout session for the plan the form submitted, and
 * redirects the browser to Stripe's hosted page.
 *
 * `redirect` throws internally, so a successful call never reaches its own
 * return — only a problem building the session does, which is what
 * `CheckoutState.error` is for.
 *
 * What a student is told and what the log records are deliberately not the
 * same thing. Stripe's own message ("Invalid API Key provided: …") names
 * this deployment's configuration, which is the owner's business and no use
 * whatsoever to somebody who only wants to subscribe — so the detail goes to
 * the server log and the screen gets a sentence it can act on.
 */
export async function startCheckout(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const plan = parseCheckoutPlan(formData.get("plan"));
  if (!plan) return { error: "Unknown plan." };

  const secretKey = envValue("STRIPE_SECRET_KEY");
  const priceId = envValue(PRICE_ID_ENV_VAR[plan]);

  if (!looksLikeSecretKey(secretKey)) {
    console.error(
      "STRIPE_SECRET_KEY is missing or is not shaped like a Stripe secret key (sk_test_… / sk_live_…).",
    );
    return { error: NOT_CONFIGURED };
  }

  if (!looksLikePriceId(priceId)) {
    console.error(
      `${PRICE_ID_ENV_VAR[plan]} is missing or is not shaped like a Stripe price id (price_…).`,
    );
    return { error: NOT_CONFIGURED };
  }

  const base = appUrl();
  const result = await createCheckoutSession({
    secretKey,
    priceId,
    plan,
    userId: user.id,
    email: user.email,
    successUrl: `${base}/upgrade?success=1`,
    cancelUrl: `${base}/upgrade`,
  });

  if (result.status === "failed") {
    console.error("Stripe could not start a checkout session:", result.error);
    return { error: "Checkout could not be started. Please try again in a moment." };
  }

  redirect(result.url);
}
