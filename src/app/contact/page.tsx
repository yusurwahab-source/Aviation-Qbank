import type { Metadata } from "next";
import Link from "next/link";

import { Card, PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `How to reach ${siteConfig.name} about a question, a bug, or an aircraft you want added.`,
};

export default function ContactPage() {
  return (
    <>
      <PageHeading
        eyebrow="Contact"
        title="Get in touch"
        subtitle="Particularly about a question you think is wrong."
      />

      <Card>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Email{" "}
            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className="font-medium text-brand hover:underline"
            >
              {siteConfig.supportEmail}
            </a>
            . We read every message.
          </p>
          <p>
            <strong className="text-foreground">A question you believe is wrong</strong> is the
            most useful thing you can send. The fastest way is the &ldquo;Report a problem with
            this question&rdquo; link under any question in a test — it records the exact
            question id automatically. You can also email us the id directly; every question
            carries one, shown on the review screen after a test, in the form{" "}
            <code className="font-mono text-foreground">B737-ELEC-0042</code>.
          </p>
          <p>
            <strong className="text-foreground">An aircraft you want added.</strong> Tell us the
            type on the aircraft picker&rsquo;s &ldquo;which aircraft next?&rdquo; form, or by
            email — either reaches the same list the owner reviews.
          </p>
          <p>
            <strong className="text-foreground">Billing.</strong> For a subscription bought
            through Stripe, the fastest path is the receipt Stripe emailed you, which can manage
            or cancel it directly. For anything else — a refund request, a one-time-payment plan,
            a gift code — email us.
          </p>
          <p>
            <strong className="text-foreground">Your data.</strong> Exporting or deleting your
            account is self-service from{" "}
            <Link href="/account" className="font-medium text-brand hover:underline">
              account settings
            </Link>
            . Email us if you need help with either.
          </p>
        </div>
      </Card>
    </>
  );
}
