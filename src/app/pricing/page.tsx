import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Card, PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";
import { FREE_SYSTEMS, PLAN_LIMITS, PRICING_TIERS, formatPrice } from "@/config/plans";
import { getSiteSettings } from "@/db/settings";

import { EarlyAccessForm } from "./early-access-form";

export const metadata: Metadata = {
  title: "Pricing",
  description: `What is free on ${siteConfig.name}, and what premium adds.`,
};
export const dynamic = "force-dynamic";

const FREE_B737_SYSTEMS = FREE_SYSTEMS.B737 ?? [];

const COMPARISON_ROWS: Array<{ feature: string; free: string; premium: string }> = [
  {
    feature: "Systems on the B737",
    free: `${FREE_B737_SYSTEMS.length} systems, full access`,
    premium: "Every system",
  },
  { feature: "The DA40, and every future aircraft", free: "Full access", premium: "Full access" },
  {
    feature: "Questions per test",
    free: `Up to ${PLAN_LIMITS.free.maxQuestionsPerTest}`,
    premium: "Unlimited",
  },
  { feature: "Study mode", free: "Included", premium: "Included" },
  { feature: "Exam mode, timed", free: "—", premium: "Included" },
  {
    feature: "Smart test presets (weak systems, flagged, wrong, unseen)",
    free: "—",
    premium: "Included",
  },
  { feature: "Progress reports", free: "Included", premium: "Included" },
  { feature: "Flags and notes on questions", free: "Included", premium: "Included" },
];

const FAQ = [
  {
    question: "Why is checkout not live yet?",
    answer:
      "The plans above are close to final, not the payment page — this is a preview so the pricing itself can be seen before checkout is wired up. Join the early access list on a plan and you'll be emailed the moment it opens, usually with an early-access discount.",
  },
  {
    question: "What exactly is free?",
    answer: `Full, unmetered access to ${FREE_B737_SYSTEMS.length || "a handful of"} B737 systems (${FREE_B737_SYSTEMS.join(", ") || "see the aircraft page"}) and the whole DA40 bank, study mode, up to ${PLAN_LIMITS.free.maxQuestionsPerTest} questions a test, and progress reports. No card required, and no time limit on the free tier itself.`,
  },
  {
    question: "Is this a subscription?",
    answer:
      "The three plans above are one-time payments for a fixed period — 3 months, 12 months, or forever. None of them auto-renew or charge again on their own.",
  },
  {
    question: "What if I already pay monthly or every three months?",
    answer:
      "That's a separate, existing plan at /upgrade and it keeps working exactly as it does today. These three are a different way to pay for the same full access, not a replacement for it.",
  },
];

export default async function PricingPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <PageHeading
        eyebrow="Pricing"
        title="Free to start, on every type"
        subtitle="Practise before you decide whether this is worth paying for."
      />

      <ul className="grid gap-4 md:grid-cols-3">
        {PRICING_TIERS.map((tier) => (
          <li key={tier.id} className="relative">
            {tier.mostPopular ? (
              <p className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge tone="brand">Most popular</Badge>
              </p>
            ) : null}
            <Card
              className={`flex h-full flex-col ${tier.mostPopular ? "border-brand shadow-md" : ""}`}
            >
              <h2 className="text-lg font-semibold text-foreground">{tier.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{tier.blurb}</p>
              <p className="mt-4">
                <span className="text-3xl font-semibold tabular-nums text-foreground">
                  {formatPrice(tier.priceCents, tier.currency)}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">
                  {tier.months === null ? "once, forever" : `for ${tier.months} months`}
                </span>
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-muted-foreground">
                <li>Every aircraft, every system</li>
                <li>Unlimited questions per test</li>
                <li>Exam mode and smart test presets</li>
              </ul>
              <div className="mt-5">
                <EarlyAccessForm tier={tier.id} tierName={tier.name} />
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-center text-xs text-subtle-foreground">
        Prices shown are one-time payments and may change before checkout opens.
      </p>

      <Card className="mt-8">
        <p className="text-sm font-medium text-foreground">30-day money-back guarantee</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Not the right fit? Email us within 30 days of paying and we&rsquo;ll refund it, no
          questions asked.
        </p>
      </Card>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">Free vs Premium</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-muted text-left">
                <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                  Feature
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                  Free
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-muted-foreground">
                  Premium
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="border-t border-border bg-surface">
                  <td className="px-4 py-3 font-medium text-foreground">{row.feature}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.free}</td>
                  <td className="px-4 py-3 text-foreground">{row.premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-subtle-foreground">
          The free plan also includes a {settings.freeQuestionsPerAircraft}-question head start on
          any aircraft not listed above.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">Questions</h2>
        <Card className="mt-3">
          <dl className="space-y-5 text-sm leading-relaxed text-muted-foreground">
            {FAQ.map((entry) => (
              <div key={entry.question}>
                <dt className="font-semibold text-foreground">{entry.question}</dt>
                <dd className="mt-1">{entry.answer}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>

      <p className="mt-8">
        <Link href="/upgrade" className="link-standalone text-sm font-medium text-brand hover:underline">
          Looking for the existing monthly / every-3-months plan? →
        </Link>
      </p>
    </>
  );
}
