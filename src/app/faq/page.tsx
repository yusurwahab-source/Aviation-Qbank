import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "FAQ",
  description: `Common questions about how ${siteConfig.name} works.`,
};

/**
 * The last seven were the homepage's "Before you start" accordion until the
 * homepage became a three-card gateway; they live here now so nothing a
 * visitor could read before was lost.
 */
const ANSWERS: { question: string; answer: ReactNode }[] = [
  {
    question: "Do I need an account to practise?",
    answer:
      "No. Anyone can build a test and answer questions. An account is what gives you somewhere to record them, which is what the progress report is built from.",
  },
  {
    question: "What happens if I refresh in the middle of a test?",
    answer:
      "Signed in, the same test comes back — the same questions, the answers you had already given, and the clock where you left it rather than reset. Signed out there is nothing recorded to resume from, so you get a fresh test.",
  },
  {
    question: "Does an abandoned test still count?",
    answer:
      "The answers you gave do. They are saved as you give them, so they appear in your topic breakdown and your retry list immediately. It is not counted as a test taken until you finish it.",
  },
  {
    question: "How is the exam clock decided?",
    answer:
      "One minute a question, always. It is not a setting: a time limit you pick is a limit you can pick your way around. Twenty questions is twenty minutes, and the builder states the figure before you start.",
  },
  {
    question: "Which questions does the retry list show?",
    answer:
      "The ones whose most recent answer was wrong. A question you have since got right drops off it — a list that only ever grows is one nobody uses.",
  },
  {
    question: "Is this based on real exam questions?",
    answer: (
      <>
        Yes — the questions are written to be very close to the ones you will meet in the real
        exam: the same format, the same style and the same level of difficulty. They are written
        by a commercial pilot who has sat these exams, not copied from leaked exam papers. Wrong
        answers are close calls rather than obviously silly ones, and the correct answer is spread
        evenly across every option, so you can&rsquo;t learn the pattern instead of the subject.
      </>
    ),
  },
  {
    question: "Does it work for my airline?",
    answer: (
      <>
        For a type rating, yes — it covers systems knowledge that holds across operators. A small
        number of questions turn on a figure that varies by operator or configuration — those say
        so directly in the explanation, so you always know when a number is worth checking
        against your own FCOM.
      </>
    ),
  },
  {
    question: "Do I need internet?",
    answer: (
      <>
        Yes. Questions and grading are served live, so practising needs a connection — this is not
        a fully offline app. It does install to your home screen and load quickly even on a slow
        connection, which is a different thing from working with no connection at all.
      </>
    ),
  },
  {
    question: "How often is it updated?",
    answer: (
      <>
        Whenever a question is added or corrected. Content ships the moment a change is deployed
        — there is no separate publishing step and no waiting for a release.
      </>
    ),
  },
  {
    question: "Can I use it alongside my FCOM?",
    answer: (
      <>
        Yes — that is the intent. This is practice material, never a substitute for your
        aircraft&rsquo;s own manuals. If anything here ever seems to disagree with your own aircraft&rsquo;s
        manual, the manual wins.
      </>
    ),
  },
  {
    question: "What happens to my progress?",
    answer: (
      <>
        Signed in, every answer is saved as you give it and feeds your progress report — by
        system, over time, and as a list of what to retry. Signed out, a test is still graded and
        scored, but nothing is recorded, so there is nothing to come back to.
      </>
    ),
  },
  {
    question: "What if I find a mistake in a question?",
    answer: (
      <>
        Tell us —{" "}
        <Link href="/contact" className="font-medium text-brand-ink hover:underline">
          the contact page
        </Link>{" "}
        reaches the person who maintains the content. Questions live as files and ship the moment
        a fix is merged, so a reported error does not sit for long.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHeading
        eyebrow="FAQ"
        title="Common questions"
        subtitle="How the question bank behaves, and why."
      />

      <ComingSoon note="More answers will be added here as they are actually asked.">
        <dl className="space-y-5">
          {ANSWERS.map((entry) => (
            <div key={entry.question}>
              <dt className="font-semibold text-foreground">{entry.question}</dt>
              <dd className="mt-1">{entry.answer}</dd>
            </div>
          ))}
        </dl>
      </ComingSoon>
    </>
  );
}
