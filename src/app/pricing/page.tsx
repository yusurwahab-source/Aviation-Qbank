import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card, PageHeading } from "@/components/ui";
import { FREE_MODE } from "@/config/free-mode";
import { siteConfig } from "@/config/site";
import { subscriptionBenefits, UPGRADE_PROMPT_PRICE } from "@/config/pricing";
import { getSiteSettings } from "@/db/settings";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Pricing",
  description: `What is free on ${siteConfig.name}, and what a subscription adds.`,
};

/**
 * Readable by anyone, signed in or not — what a subscription is should be
 * clear before there is an account. The upgrade dialog opens over this page
 * at once (see `UpgradePromptDialog`); this is the same information at rest.
 */
export default async function PricingPage() {
  // Hidden while the site is free — see `config/free-mode.ts`.
  if (FREE_MODE) notFound();

  const [settings, user] = await Promise.all([getSiteSettings(), getCurrentUser().catch(() => null)]);
  const free = settings.freeQuestionsPerAircraft;

  return (
    <>
      <PageHeading
        eyebrow="Pricing"
        title="Free to start, on every aircraft"
        subtitle="Practise before you decide whether this is worth paying for."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col">
          <h2 className="text-lg font-semibold text-foreground">Free</h2>
          <p className="mt-2 text-3xl font-semibold text-foreground">€0</p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>{free} questions on each aircraft — the allowance is per aircraft, and a question you have already seen never costs more.</li>
            <li>EASA ATPL Ground School subjects and Pilot Sims, free in full.</li>
            <li>A short preview of any bank before you even make an account.</li>
          </ul>
          <Link
            href={user ? "/type-rating" : "/signup"}
            className="tap-target mt-6 inline-flex items-center justify-center rounded-lg border border-border px-6 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand-ink"
          >
            {user ? "Keep practising" : "Create a free account"}
          </Link>
        </Card>

        <Card className="flex flex-col border-brand">
          <h2 className="text-lg font-semibold text-foreground">Subscribed</h2>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-foreground">{UPGRADE_PROMPT_PRICE.amount}</span>
            <span className="text-sm text-muted-foreground">{UPGRADE_PROMPT_PRICE.period}</span>
          </p>
          <p className="text-xs text-subtle-foreground">
            {UPGRADE_PROMPT_PRICE.note} · also available every three months
          </p>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {subscriptionBenefits(free).map((benefit) => (
              <li key={benefit.title}>
                <strong className="font-semibold text-foreground">{benefit.title}</strong> —{" "}
                {benefit.body}
              </li>
            ))}
          </ul>
          <Link
            href={user ? "/upgrade" : "/signup"}
            className="tap-target mt-6 inline-flex items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
          >
            {user ? "See plans and subscribe" : "Create an account to subscribe"}
          </Link>
        </Card>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Practice does not require an account — signing out never takes the question bank away. It
        just means there is nowhere to record what you answered, so nothing appears in your
        progress. Have a gift code?{" "}
        <Link href="/redeem" className="font-medium text-brand-ink hover:underline">
          Redeem it here
        </Link>
        .
      </p>
    </>
  );
}
