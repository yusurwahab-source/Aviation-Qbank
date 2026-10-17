import type { Metadata } from "next";
import Link from "next/link";

import { PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/lib/auth/session";

import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: `How to reach ${siteConfig.name} about a question, a bug, or an aircraft you want added.`,
};

export default async function ContactPage() {
  const user = await getCurrentUser().catch(() => null);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeading
        eyebrow="Contact"
        title="Get in touch"
        subtitle="Particularly about a question you think is wrong."
      />

      <div className="mb-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          The most useful thing you can send is a{" "}
          <strong className="text-foreground">question you believe is wrong</strong>, with its id —
          every question carries one, shown on the review screen after a test, in the form{" "}
          <code className="font-mono text-foreground">B737-ELEC-0042</code>. That id is enough to
          find the exact question and its history.
        </p>
        <p>
          Also worth sending: an aircraft you would want a bank for, and anything that behaved in a
          way you did not expect. Forgotten your password? You do not need to write —{" "}
          <Link href="/forgot-password" className="font-medium text-brand-ink hover:underline">
            reset it here
          </Link>
          .
        </p>
      </div>

      <ContactForm defaultEmail={user?.email} />
    </div>
  );
}
