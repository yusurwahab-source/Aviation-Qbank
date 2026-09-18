"use server";

import { redirect } from "next/navigation";

import { createCheckoutSession, parseCheckoutPlan } from "@/lib/billing/stripe";
import { getCurrentUser } from "@/lib/auth/session";
import { appUrl } from "@/lib/email/send";

export type CheckoutState = { error?: string };

/** Which env var names a plan's Stripe Price, keyed the same way as the plan itself. */
const PRICE_ID_ENV_VAR = {
  monthly: "STRIPE_MONTHLY_PRICE_ID",
  quarterly: "STRIPE_QUARTERLY_PRICE_ID",
} as const;

/**
 * Starts a Stripe Checkout session for the plan the form submitted, and
 * redirects the browser to Stripe's hosted page.
 *
 * `redirect` throws internally, so a successful call never reaches its own
 * return — only a problem building the session does, which is what
 * `CheckoutState.error` is for.
 */
export async function startCheckout(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const plan = parseCheckoutPlan(formData.get("plan"));
  if (!plan) return { error: "Unknown plan." };

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env[PRICE_ID_ENV_VAR[plan]];
  if (!secretKey || !priceId) {
    return { error: "Payments are not configured on this deployment yet." };
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

  if (result.status === "failed") return { error: result.error };

  redirect(result.url);
}
