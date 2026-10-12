import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms",
  description: `The terms covering use of ${siteConfig.name}.`,
};

export default function TermsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Terms"
        title="Terms of use"
        subtitle="Not yet published — what follows is the plain-English version of how this is meant to be used."
      />

      <ComingSoon note="These are notes, not terms. Nothing on this page has been through a lawyer, and it does not form an agreement.">
        <p>
          <strong className="text-foreground">This is practice material, not an authority.</strong>{" "}
          Questions are written to help you prepare for a type rating or class rating
          examination. They are not the aircraft&rsquo;s approved manuals and must never be used
          in place of them. For anything you intend to act on in an aircraft, the AFM, FCOM and
          your operator&rsquo;s own documentation are the source — not this site.
        </p>
        <p>
          <strong className="text-foreground">No guarantee of accuracy.</strong> Every question
          is checked against a schema before it can be published, and sourced questions carry
          a reference. That is a process, not a promise: where a figure has not been confirmed
          against a published source, the repository records that openly rather than quietly.
        </p>
        <p>
          <strong className="text-foreground">Your account is yours.</strong> Do not share it.
          Your answer history is what every report you see is built from, and a shared account
          produces a report that describes nobody.
        </p>
        <p>
          <strong className="text-foreground">Paid plans.</strong> Every part of PilotQBank is
          free to use at the moment, and nothing is charged. If paid plans return, their terms,
          including how a subscription renews and how it is cancelled, will be published here
          before anyone is asked to pay.
        </p>
      </ComingSoon>
    </>
  );
}
