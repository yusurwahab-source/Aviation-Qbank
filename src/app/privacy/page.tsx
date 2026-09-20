import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${siteConfig.name} stores, and why.`,
};

export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <>
      <PageHeading
        eyebrow="Privacy"
        title="What is stored, and why"
        subtitle="Not yet a formal policy — this is an accurate description of what the application actually does today."
      />

      <ComingSoon note="A formal privacy policy has not been published yet. Everything below describes the current implementation rather than making a legal commitment.">
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
          in and to send a password reset link if you ask for one. Nothing else is sent to it.
        </p>
      </ComingSoon>
    </>
  );
}
