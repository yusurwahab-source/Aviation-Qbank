import type { Metadata } from "next";
import Link from "next/link";

import { Card, PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms",
  description: `The terms covering use of ${siteConfig.name}.`,
};

export default function TermsPage() {
  return (
    <>
      <PageHeading eyebrow="Terms" title="Terms of use" />

      <Card>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            By using {siteConfig.name} you agree to these terms. If you do not agree, do not use
            the site.
          </p>
          <p>
            <strong className="text-foreground">This is practice material, not an
            authority.</strong> See{" "}
            <Link href="/disclaimer" className="font-medium text-brand hover:underline">
              the disclaimer
            </Link>{" "}
            for what this site is and is not — it is not affiliated with, authorised by, or
            endorsed by any aircraft manufacturer, and it is never a substitute for the AFM, the
            FCOM, or your operator&rsquo;s own documentation.
          </p>
          <p>
            <strong className="text-foreground">No guarantee of accuracy.</strong> Every question
            is checked against a schema before it can be published, and sourced questions carry a
            reference. That is a process, not a promise: where a figure has not been confirmed
            against a published source, that is recorded openly rather than hidden. Use the
            &ldquo;Report a problem with this question&rdquo; link, or{" "}
            <Link href="/contact" className="font-medium text-brand hover:underline">
              contact us
            </Link>
            , if you believe a question is wrong.
          </p>
          <p>
            <strong className="text-foreground">Your account.</strong> You are responsible for
            keeping your password confidential and for everything that happens under your
            account. Do not share it — your answer history is what every report you see is built
            from, and a shared account produces a report that describes nobody. You may delete
            your account and its data at any time from account settings.
          </p>
          <p>
            <strong className="text-foreground">Acceptable use.</strong> Do not attempt to
            circumvent the free-tier limits, scrape the question bank, or use the service to
            build a competing product. We may suspend or terminate an account that abuses the
            service.
          </p>
          <p>
            <strong className="text-foreground">Payments and refunds.</strong> Where billing runs
            through Stripe as a recurring subscription, it renews until cancelled, and can be
            cancelled from the receipt Stripe emails when you subscribe. Where a plan is sold as a
            one-time payment for a fixed period, it does not renew on its own. A 30-day
            money-back guarantee applies to a paid plan you are not satisfied with — see{" "}
            <Link href="/pricing" className="font-medium text-brand hover:underline">
              pricing
            </Link>
            .
          </p>
          <p>
            <strong className="text-foreground">No warranty; limitation of liability.</strong> The
            service is provided &ldquo;as is&rdquo;, without warranty of any kind. To the extent
            permitted by law, {siteConfig.name} is not liable for any indirect, incidental, or
            consequential damages arising from your use of the service, including any reliance on
            its content for a real examination or flight.
          </p>
          <p>
            <strong className="text-foreground">Changes.</strong> These terms may change as the
            product does. Continuing to use the service after a change means you accept the
            updated terms.
          </p>
          <p>
            Questions about these terms go to{" "}
            <Link href="/contact" className="font-medium text-brand hover:underline">
              /contact
            </Link>
            .
          </p>
        </div>
      </Card>
    </>
  );
}
