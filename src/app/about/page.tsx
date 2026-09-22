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
          <strong className="text-foreground">The goal is understanding the aircraft, not
          memorising questions.</strong> A question bank you have simply memorised is worthless
          the moment the real exam phrases the same fact differently — so every wrong option
          here has to be ruled out by knowing the system, not recognised by its shape or its
          length. If you can only get a question right by having seen that exact question
          before, that is a question worth rewriting, and we treat it as a bug.
        </p>
        <p>
          {siteConfig.name} is a practice question bank built around three sections:{" "}
          <strong className="text-foreground">Type Rating Systems Knowledge</strong> for large
          aircraft, <strong className="text-foreground">Class Rating Systems Knowledge</strong>{" "}
          for light aircraft, and <strong className="text-foreground">Flying Knowledge</strong>{" "}
          — free in full — for the ground-school material every pilot keeps reviewing rather
          than sits once and moves past. You choose a section, build a test from any
          combination of topics and any number of questions, and sit it one of two ways.
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
