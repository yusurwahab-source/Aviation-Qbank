import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "About",
  description: `What ${siteConfig.name} is, who it is for, and where the questions come from.`,
};

export default function AboutPage() {
  return (
    <>
      <PageHeading
        eyebrow="About"
        title={`What ${siteConfig.name} is`}
        subtitle={siteConfig.tagline}
      />

      <ComingSoon note="A fuller about page — who is behind this, and how question banks are reviewed — is still to be written.">
        <p>
          {siteConfig.name} is a practice question bank for aircraft type ratings. You choose a
          type, build a test from any combination of sections and any number of questions, and
          sit it one of two ways.
        </p>
        <p>
          <strong className="text-foreground">Study</strong> marks each answer as you give it
          and shows the correct option with an explanation underneath. There is no clock.{" "}
          <strong className="text-foreground">Exam</strong> holds everything back until the
          end and gives you one minute a question, which is the closest this can get to sitting
          the real thing.
        </p>
        <p>
          Every answer a signed-in student gives is recorded as it is given, not only at the
          end — so an abandoned test still counts towards your progress, and refreshing
          mid-test picks up where you were rather than starting again.
        </p>
        <p>
          Questions live as files in the repository, one folder per aircraft, and are checked
          against a schema before they can reach anybody. Where a question comes from a
          published source it carries a reference; where the source has not been confirmed
          twice, that is recorded rather than glossed over.
        </p>
      </ComingSoon>
    </>
  );
}
