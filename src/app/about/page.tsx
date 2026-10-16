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
        title="About PilotQBank"
        subtitle="A study platform for the European aviation community"
      />

      <Card>
        <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Why we built this</h2>
            <p>
              PilotQBank is built for students working through the demands and costs of aviation
              training. Our goal is to provide an approachable study platform for the journey from
              ATPL theory through aircraft systems and type rating preparation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Understand, don’t memorize</h2>
            <p>
              Question banks can change, but sound knowledge stays with you in the cockpit and
              during interviews. We focus on clear explanations that help you understand why an
              answer is right and rule out alternatives through knowledge of the subject—not
              recognition of a question you have seen before.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">A community project</h2>
            <p>
              PilotQBank is an ongoing project, and we welcome feedback and corrections from
              students and aviation professionals. Questions are reviewed and updated over time;
              source references are included where available, and coverage and verification vary
              between subjects and aircraft.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Important disclaimer</h2>
            <p>
              PilotQBank is a supplementary revision and learning resource only. It does not
              replace your approved training organization’s syllabus, instructor guidance, or
              official aircraft documentation, including the FCOM or AFM. Always verify
              aircraft-specific information against the documentation applicable to your
              aircraft and operator.
            </p>
          </section>
        </div>
      </Card>
    </>
  );
}
