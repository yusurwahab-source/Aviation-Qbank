import Link from "next/link";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";
import { FREE_QUESTIONS_PER_AIRCRAFT } from "@/lib/billing/access-policy";

export const metadata: Metadata = {
  title: "Pricing",
  description: `What is free on ${siteConfig.name}, and what a subscription adds.`,
};

export default function PricingPage() {
  return (
    <>
      <PageHeading
        eyebrow="Pricing"
        title="Free to start, on every type"
        subtitle="Practise before you decide whether this is worth paying for."
      />

      <ComingSoon note="The plan prices themselves are shown at checkout rather than here — they are set in Stripe, so this page cannot state them without going out of date.">
        <p>
          <strong className="text-foreground">Free.</strong> Every signed-in student may answer{" "}
          {FREE_QUESTIONS_PER_AIRCRAFT} questions on <em>each</em> aircraft at no cost. The
          allowance is per type, so trying a second aircraft does not spend the one you have
          left on the first, and answering a question you have already seen never costs
          anything further.
        </p>
        <p>
          <strong className="text-foreground">Subscribed.</strong> Unlimited questions on every
          type, in both study and exam mode, with the full progress report behind them. Monthly
          or every three months, cancelled from the receipt Stripe emails you.
        </p>
        <p>
          Practice does not require an account at all — signing out never takes the question
          bank away. It just means there is nowhere to record what you answered, so nothing
          appears in your progress.
        </p>
        <p>
          <Link href="/upgrade" className="font-medium text-brand hover:underline">
            See the current plans →
          </Link>
        </p>
      </ComingSoon>
    </>
  );
}
