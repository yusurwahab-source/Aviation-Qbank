import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `How to reach ${siteConfig.name} about a question, a bug, or an aircraft you want added.`,
};

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <>
      <PageHeading
        eyebrow="Contact"
        title="Get in touch"
        subtitle="Particularly about a question you think is wrong."
      />

      <ComingSoon note="A contact address and a report-this-question button are not wired up yet. Until they are, there is no way to reach us from inside the app.">
        <p>
          The most useful thing you can send is a{" "}
          <strong className="text-foreground">question you believe is wrong</strong>, with its
          id — every question carries one, shown on the review screen after a test, in the form{" "}
          <code className="font-mono text-foreground">B737-ELEC-0042</code>. That id is enough
          to find the exact question, its source and its history.
        </p>
        <p>
          Also worth sending: an aircraft type you would want a bank for, and anything in the
          application that behaved in a way you did not expect.
        </p>
      </ComingSoon>
    </>
  );
}
