import type { Metadata } from "next";

import { Card, PageHeading } from "@/components/ui";
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

      <Card>
        <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Why PilotQBank exists</h2>
            <p>
              The goal is understanding the aircraft, not memorising questions. A student should
              be able to rule out each wrong option by understanding the system, even when an
              exam asks about it in a different way. If a question can only be answered by
              remembering that exact question, it needs to be rewritten.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">What you can practise</h2>
            <p>
              {siteConfig.name} brings together three areas:{" "}
              <strong className="text-foreground">EASA ATPL Ground School</strong> for general
              theory subjects, free in full;{" "}
              <strong className="text-foreground">Aircraft Systems Knowledge</strong> for type
              rating and class rating aircraft; and{" "}
              <strong className="text-foreground">Pilot Sims &amp; Flight Trainers</strong> for
              interactive practice. In the question-bank sections, choose the topics and number
              of questions for your test.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">How tests work</h2>
            <p>
              In <strong className="text-foreground">Study</strong> mode, each answer is marked
              immediately and the explanation is shown; there is no time limit.{" "}
              <strong className="text-foreground">Exam</strong> mode saves the review until the
              end and allows one minute per question.
            </p>
            <p>
              You can practise without an account. When signed in, your answers are saved as you
              give them, so you can review your progress and resume an unfinished test.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">A note about the content</h2>
            <p>
              Question files are validated before publication, and source references are included
              where available. Coverage and verification vary by subject and aircraft, so use
              this as practice material—not as a substitute for approved aircraft manuals,
              training, or official exam material.
            </p>
          </section>
        </div>
      </Card>
    </>
  );
}
