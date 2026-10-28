import type { Metadata } from "next";
import Link from "next/link";

import ContactWithGlobe, { type ContactLink } from "@/components/ui/contact-with-globe";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/lib/auth/session";
import { whatsappHref } from "@/lib/contact-links";

import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: `How to reach ${siteConfig.name} about a question, a bug, or an aircraft you want added.`,
};

const CONTACT_LINKS: ContactLink[] = [
  {
    icon: "chat",
    label: `WhatsApp ${siteConfig.whatsapp.display}`,
    href: whatsappHref(siteConfig.whatsapp.number, `Hello ${siteConfig.name}, I have a question.`),
    external: true,
  },
  {
    icon: "phone",
    label: siteConfig.whatsapp.display,
    href: `tel:+${siteConfig.whatsapp.number}`,
  },
];

export default async function ContactPage() {
  const user = await getCurrentUser().catch(() => null);

  return (
    <ContactWithGlobe
      titleAs="h1"
      title="Get in touch"
      description="Particularly about a question you think is wrong."
      asideTitle="How to reach us"
      asideText={
        <>
          <p>
            The most useful thing you can send is a{" "}
            <strong className="text-foreground">question you believe is wrong</strong>, with its
            id — every question carries one, shown on the review screen after a test, in the form{" "}
            <code className="font-mono text-foreground">B737-ELEC-0042</code>. That id is enough to
            find the exact question and its history.
          </p>
          <p>
            Also worth sending: an aircraft you would want a bank for, and anything that behaved in
            a way you did not expect. Forgotten your password? You do not need to write —{" "}
            <Link href="/forgot-password" className="font-medium text-brand-ink hover:underline">
              reset it here
            </Link>
            .
          </p>
        </>
      }
      links={CONTACT_LINKS}
      formDescription="We read every message and reply to the email address you give."
    >
      <ContactForm defaultEmail={user?.email} />
    </ContactWithGlobe>
  );
}
