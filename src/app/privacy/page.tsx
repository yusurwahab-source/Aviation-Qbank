import type { Metadata } from "next";
import Link from "next/link";

import { Card, PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${siteConfig.name} stores, and why.`,
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeading eyebrow="Privacy" title="What is stored, and why" />

      <Card>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>This describes what the application actually stores, in plain language.</p>
          <p>
            <strong className="text-foreground">Your account.</strong> An email address and a
            password. The password itself is never stored — only a scrypt hash of it, which
            cannot be reversed back into the password.
          </p>
          <p>
            <strong className="text-foreground">Your sessions.</strong> Staying signed in uses a
            cookie holding a random value. The database stores only a SHA-256 of that value, so
            reading the table would not let anybody pose as you. Signing out deletes the row,
            which revokes the session immediately rather than waiting for it to expire.
          </p>
          <p>
            <strong className="text-foreground">Your answers.</strong> Every answer you give
            while signed in is recorded: the question, the aircraft, the option you chose,
            whether it was right, and when. That record is what the whole progress report is
            built from. Every report query is scoped to one account — there is no view in this
            application that shows one student another student&rsquo;s history.
          </p>
          <p>
            <strong className="text-foreground">Payments.</strong> Card details never reach this
            server. Checkout happens on a page Stripe hosts and is responsible for; what comes
            back here is whether a subscription is active and when its period ends.
          </p>
          <p>
            <strong className="text-foreground">Email.</strong> Your address is used to sign you
            in, to send a welcome email when you sign up, and to send a password reset link if
            you ask for one. Nothing else is sent to it.
          </p>
          <p>
            <strong className="text-foreground">Early access and aircraft requests.</strong> If
            you submit an email address on the pricing page or the landing page&rsquo;s
            &ldquo;which aircraft next?&rdquo; form, we store it to follow up — it is not linked
            to an account unless the addresses match.
          </p>
          <p>
            <strong className="text-foreground">Cookies.</strong> Only what the site itself needs
            to function — the session cookie above, and a local preference for your theme (light
            or dark). No advertising or analytics cookies are set, so there is no cookie consent
            banner: there is nothing here to ask consent for.
          </p>
          <p>
            <strong className="text-foreground">Your data is yours.</strong> From{" "}
            <Link href="/account" className="font-medium text-brand hover:underline">
              account settings
            </Link>{" "}
            you can export everything stored about you as a file, or delete your account
            outright. Deleting your account removes your sessions, answer history, flags, notes,
            and subscription record; it cannot be undone.
          </p>
          <p>
            Questions about this page go to{" "}
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
