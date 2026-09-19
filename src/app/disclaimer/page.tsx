import type { Metadata } from "next";
import Link from "next/link";

import { Card, PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: `${siteConfig.name} is an independent study aid, not an official source.`,
};

/**
 * The one page whose wording is load-bearing rather than merely accurate.
 * Every sentence here exists to draw a line this product must never cross:
 * it prepares someone for an exam, it does not certify them for a flight
 * deck. See the note in CLAUDE.md on why this page exists and what it must
 * say.
 */
export default function DisclaimerPage() {
  return (
    <>
      <PageHeading
        eyebrow="Disclaimer"
        title="An independent study aid"
        subtitle="Read this before you use anything on this site to prepare for a real checkride."
      />

      <Card>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">{siteConfig.name} is an independent study
            aid.</strong> It is not affiliated with, authorised by, sponsored by, or endorsed by
            The Boeing Company, Diamond Aircraft Industries, or any airline, training
            organisation, or civil aviation authority. Aircraft type names, model numbers, and
            manufacturer names used on this site (including &ldquo;737&rdquo; and
            &ldquo;DA40&rdquo;) are used only to identify which type each question bank covers.
            All trademarks, service marks and trade names referenced on this site are the
            property of their respective owners.
          </p>
          <p>
            <strong className="text-foreground">This content is for training preparation
            only.</strong> Every question is written to help a student pilot rehearse the kind of
            question a type-rating examination asks. It is practice material, not a reference: it
            must never be used in place of the aircraft&rsquo;s approved Flight Crew Operating
            Manual (FCOM), Airplane Flight Manual (AFM), an operator&rsquo;s own approved
            documentation, or type-rating training delivered by an approved training
            organisation. Where this site and an official manual disagree, the manual is right.
          </p>
          <p>
            <strong className="text-foreground">Accuracy is a process, not a promise.</strong>{" "}
            Every question passes a schema check before publication, and sourced questions carry
            a reference to where the figure came from. That is what keeps a malformed question
            off the site — it is not a guarantee that every number is current or that every
            question matches the exact revision of a manual you are flying. See{" "}
            <Link href="/contact" className="font-medium text-brand hover:underline">
              how to report a question you believe is wrong
            </Link>
            , and use the &ldquo;Report a problem with this question&rdquo; link under any
            question in a test.
          </p>
          <p>
            <strong className="text-foreground">Nothing here is instruction, and nothing here
            certifies anything.</strong> Completing a test on this site, passing it, or reaching a
            particular score does not mean you are competent, current, or qualified to operate any
            aircraft. Only your training organisation, your instructor, and the relevant civil
            aviation authority can determine that.
          </p>
          <p>
            Questions about this disclaimer, or about a specific question&rsquo;s accuracy, go to{" "}
            <Link href="/contact" className="font-medium text-brand hover:underline">
              /contact
            </Link>
            .
          </p>
        </div>
      </Card>

      <p className="mt-6">
        <Link href="/aircraft" className="link-standalone text-sm font-medium text-brand hover:underline">
          ← Back to the aircraft
        </Link>
      </p>
    </>
  );
}
