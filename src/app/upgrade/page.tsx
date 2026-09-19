import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, PageHeading } from "@/components/ui";
import { getSubscription } from "@/db/subscriptions";
import {
  CHECKOUT_PLANS,
  looksLikePriceId,
  looksLikeSecretKey,
  type CheckoutPlan,
} from "@/lib/billing/stripe";
import { FREE_QUESTIONS_PER_AIRCRAFT, hasActiveSubscription } from "@/lib/billing/access-policy";
import { getCurrentUser } from "@/lib/auth/session";
import { envValue } from "@/lib/env";

import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Upgrade" };
export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<CheckoutPlan, { name: string; blurb: string }> = {
  monthly: { name: "Monthly", blurb: "Billed every month." },
  quarterly: { name: "Every 3 months", blurb: "Billed once every three months." },
};

const PRICE_ID_ENV_VAR: Record<CheckoutPlan, string> = {
  monthly: "STRIPE_MONTHLY_PRICE_ID",
  quarterly: "STRIPE_QUARTERLY_PRICE_ID",
};

/**
 * Where a student subscribes for full access.
 *
 * Signed in only — a subscription belongs to an account, the same reasoning
 * as `/progress`. Subscribing itself happens on `startCheckout` in
 * `actions.ts`: this page only decides what to show, never calls Stripe
 * directly, so it stays a plain server component.
 */
export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string | string[]; redeemed?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [subscription, query] = await Promise.all([getSubscription(user.id), searchParams]);
  const active = subscription !== null && hasActiveSubscription(subscription);
  const justSubscribed = (Array.isArray(query.success) ? query.success[0] : query.success) === "1";
  const justRedeemed = (Array.isArray(query.redeemed) ? query.redeemed[0] : query.redeemed) === "1";

  // Shaped like a key, not merely present: a variable holding something that
  // could never work should read as "not configured", not as a button that
  // fails the moment it is pressed.
  const configured = looksLikeSecretKey(envValue("STRIPE_SECRET_KEY"));

  return (
    <>
      <PageHeading
        title="Upgrade"
        subtitle={
          active && subscription
            ? `You're on the ${subscription.plan} plan. Full access to every aircraft.`
            : `Practising is free up to ${FREE_QUESTIONS_PER_AIRCRAFT} questions on each aircraft. Subscribe for unlimited questions on every type.`
        }
      />

      {justSubscribed && !active ? (
        <Card className="mb-4">
          <p className="text-sm text-muted-foreground">
            Payment received — your subscription usually activates within a few seconds.
            Refresh this page shortly if it still shows as free.
          </p>
        </Card>
      ) : null}

      {justRedeemed ? (
        <Card className="mb-4">
          <p className="text-sm text-muted-foreground">
            Gift code redeemed — full access unlocked.
          </p>
        </Card>
      ) : null}

      {!configured ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            Payments are not configured on this deployment yet. See the{" "}
            <code className="font-mono">STRIPE_*</code> variables in{" "}
            <code className="font-mono">.env.example</code>.
          </p>
        </Card>
      ) : active ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            Nothing to do here — you already have full access. Manage or cancel your
            subscription from the receipt email Stripe sent when you subscribed.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {CHECKOUT_PLANS.map((plan) => {
            const label = PLAN_LABELS[plan];
            const priceConfigured = looksLikePriceId(envValue(PRICE_ID_ENV_VAR[plan]));

            return (
              <li key={plan}>
                <Card className="flex h-full flex-col justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{label.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{label.blurb}</p>
                  </div>
                  {priceConfigured ? (
                    <CheckoutForm plan={plan} label={`Subscribe ${label.name.toLowerCase()}`} />
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">Not configured yet.</p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {!active ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Have a gift code?{" "}
          <Link href="/redeem" className="font-medium text-brand hover:underline">
            Redeem it here
          </Link>
          .
        </p>
      ) : null}
    </>
  );
}
