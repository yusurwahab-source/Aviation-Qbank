import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeading } from "@/components/ui";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "FAQ",
  description: `Common questions about how ${siteConfig.name} works.`,
};

export const dynamic = "force-dynamic";

const ANSWERS = [
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
