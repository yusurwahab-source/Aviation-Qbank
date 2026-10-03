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
import { daysRemaining, hasActiveSubscription } from "@/lib/billing/access-policy";
import { getSiteSettings } from "@/db/settings";
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

  const [subscription, query, settings] = await Promise.all([
    getSubscription(user.id),
    searchParams,
    getSiteSettings(),
  ]);
  const active = subscription !== null && hasActiveSubscription(subscription);
  const justSubscribed = (Array.isArray(query.success) ? query.success[0] : query.success) === "1";
  const justRedeemed = (Array.isArray(query.redeemed) ? query.redeemed[0] : query.redeemed) === "1";

  // What the student actually wants to know once they have access: how long
  // it lasts. Null unless there is a confirmed period to count.
  const endsOn = active ? (subscription?.currentPeriodEnd ?? null) : null;
  const daysLeft = daysRemaining(endsOn);
  const accessSummary =
    endsOn && daysLeft !== null
      ? `Full access until ${endsOn.toLocaleDateString(undefined, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })} — ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left.`
      : null;

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
            ? (accessSummary ?? `You're on the ${subscription.plan} plan. Full access to every aircraft.`)
            : `Practising is free up to ${settings.freeQuestionsPerAircraft} questions on each aircraft. Subscribe for unlimited questions on every type.`
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
            {daysLeft !== null ? ` You have ${daysLeft} ${daysLeft === 1 ? "day" : "days"}.` : ""}
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
          {daysLeft !== null ? (
            <p className="text-2xl font-semibold text-foreground">
              {daysLeft} {daysLeft === 1 ? "day" : "days"} left
            </p>
          ) : null}
          <p className="mt-2 text-sm text-muted-foreground">
            {subscription?.provider === "gift"
              ? "Your access came from a gift code. When it runs out, subscribe here to keep going."
              : "Nothing to do here — you already have full access. Manage or cancel your subscription from the receipt email Stripe sent when you subscribed."}
          </p>
          {subscription?.provider === "gift" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Have another code?{" "}
              <Link href="/redeem" className="font-medium text-brand-ink hover:underline">
                Redeem it
              </Link>{" "}
              — a new code adds to what you have rather than replacing it.
            </p>
          ) : null}
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
          <Link href="/redeem" className="font-medium text-brand-ink hover:underline">
            Redeem it here
          </Link>
          .
        </p>
      ) : null}
    </>
  );
}
