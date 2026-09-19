import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, PageHeading } from "@/components/ui";
import { getSubscription } from "@/db/subscriptions";
import { getUserPlanState } from "@/db/users";
import { daysRemaining } from "@/lib/billing/access-policy";
import { isPremiumUser } from "@/lib/billing/plan-access";
import { getCurrentUser } from "@/lib/auth/session";

import { DeleteAccountForm } from "./delete-account-form";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [subscription, planState] = await Promise.all([
    getSubscription(user.id),
    getUserPlanState(user.id),
  ]);
  const isPremium = isPremiumUser({ plan: planState, subscription });
  const endsOn = subscription?.currentPeriodEnd ?? planState.planExpiresAt;
  const daysLeft = daysRemaining(endsOn);

  return (
    <>
      <PageHeading title="Account" subtitle={user.email} />

      <Card>
        <h2 className="text-sm font-semibold text-foreground">Plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isPremium
            ? daysLeft !== null
              ? `Premium — ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left.`
              : "Premium — full access."
            : "Free plan."}
        </p>
      </Card>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-foreground">Your data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Download everything stored about your account — your answer history, test sessions,
          flags and notes — as a file.
        </p>
        <a
          href="/account/export"
          download
          className="tap-target mt-3 inline-flex items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
        >
          Export my data
        </a>
      </Card>

      <Card className="mt-6 border-incorrect/40">
        <h2 className="text-sm font-semibold text-incorrect">Delete account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently deletes your account, sessions, answer history, flags, notes and
          subscription record. This cannot be undone.
        </p>
        <div className="mt-3">
          <DeleteAccountForm />
        </div>
      </Card>
    </>
  );
}
