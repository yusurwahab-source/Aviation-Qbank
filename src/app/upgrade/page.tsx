import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, PageHeading } from "@/components/ui";
import { getSubscription } from "@/db/subscriptions";
import {
  CHECKOUT_PLANS,
  buildCheckoutUrl,
  buildOrderExtRef,
  type CheckoutPlan,
} from "@/lib/billing/2checkout";
import { FREE_QUESTIONS_PER_AIRCRAFT, hasActiveSubscription } from "@/lib/billing/access-policy";
import { getCurrentUser } from "@/lib/auth/session";
import { appUrl } from "@/lib/email/send";

export const metadata: Metadata = { title: "Upgrade" };
export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<CheckoutPlan, { name: string; blurb: string }> = {
  monthly: { name: "Monthly", blurb: "Billed every month." },
  yearly: { name: "Yearly", blurb: "Billed once a year." },
};

/**
 * Where a student subscribes for full access.
 *
 * Signed in only — a subscription belongs to an account, the same reasoning
 * as `/progress`. The checkout link itself carries no price and no plan
 * details of its own: `productId` names a catalog product already priced in
 * the 2Checkout control panel, so a price change there needs no deploy here.
 */
export default async function UpgradePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const subscription = await getSubscription(user.id);
  const active = subscription !== null && hasActiveSubscription(subscription);

  const merchantCode = process.env.TWOCHECKOUT_MERCHANT_CODE ?? "";
  const productIds: Record<CheckoutPlan, string | undefined> = {
    monthly: process.env.TWOCHECKOUT_MONTHLY_PRODUCT_ID,
    yearly: process.env.TWOCHECKOUT_YEARLY_PRODUCT_ID,
  };
  const sandbox = process.env.NODE_ENV !== "production";

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

      {!merchantCode ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            Payments are not configured on this deployment yet. See the{" "}
            <code className="font-mono">TWOCHECKOUT_*</code> variables in{" "}
            <code className="font-mono">.env.example</code>.
          </p>
        </Card>
      ) : active ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            Nothing to do here — you already have full access. Manage or cancel your
            subscription from the confirmation email 2Checkout sent when you subscribed.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {CHECKOUT_PLANS.map((plan) => {
            const productId = productIds[plan];
            const label = PLAN_LABELS[plan];

            return (
              <li key={plan}>
                <Card className="flex h-full flex-col justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{label.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{label.blurb}</p>
                  </div>
                  {productId ? (
                    <a
                      href={buildCheckoutUrl({
                        merchantCode,
                        productId,
                        orderExtRef: buildOrderExtRef(user.id, plan),
                        email: user.email,
                        returnUrl: `${appUrl()}/upgrade`,
                        sandbox,
                      })}
                      className="mt-4 inline-block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-strong"
                    >
                      Subscribe {label.name.toLowerCase()}
                    </a>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">Not configured yet.</p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
