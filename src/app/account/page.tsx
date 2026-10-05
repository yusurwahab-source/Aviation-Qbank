import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, PageHeading } from "@/components/ui";
import { getSubscription } from "@/db/subscriptions";
import { isOptedOut } from "@/db/unsubscribe";
import { getCurrentUser } from "@/lib/auth/session";
import { daysRemaining, hasActiveSubscription } from "@/lib/billing/access-policy";

import { ChangePasswordForm } from "./change-password-form";
import { MessagePreferenceForm } from "./message-preference-form";
import { ResendVerificationForm } from "./resend-verification-form";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

/**
 * The signed-in student's own account: who they are, what access they have,
 * and the one thing they can change here — their password. Signed in only,
 * the same as `/progress` and `/upgrade`.
 */
export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [subscription, optedOut] = await Promise.all([getSubscription(user.id), isOptedOut(user.id)]);
  const active = subscription !== null && hasActiveSubscription(subscription);
  const daysLeft = active ? daysRemaining(subscription?.currentPeriodEnd ?? null) : null;

  return (
    <>
      <PageHeading eyebrow="Account" title="Your account" subtitle={user.email} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-2">
          <h2 className="text-lg font-semibold text-foreground">Email</h2>
          {user.emailVerified ? (
            <p className="mt-2 text-sm text-correct">Confirmed — {user.email}</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                {user.email} is not confirmed yet. Confirm it to subscribe and to receive messages
                from us. Practice is not affected.
              </p>
              <ResendVerificationForm />
            </>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-foreground">Access</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {active
              ? `Full access${
                  daysLeft !== null ? ` — ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left` : ""
                }.`
              : "Free plan. Subscribe for unlimited questions on every aircraft."}
          </p>
          <Link
            href="/upgrade"
            className="tap-target mt-4 inline-flex items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand-ink"
          >
            {active ? "Manage access" : "See plans"}
          </Link>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-foreground">Change password</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Changing it signs you out on every other device.
          </p>
          <ChangePasswordForm />
        </Card>

        <Card className="md:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Messages</h2>
          <MessagePreferenceForm receiving={!optedOut} />
        </Card>
      </div>
    </>
  );
}
