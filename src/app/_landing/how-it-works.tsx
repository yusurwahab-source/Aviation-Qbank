import { SectionHeading } from "./section-heading";

/**
 * What used to be the standalone "What's inside" section's own copy —
 * three pillars, each with a line of description — condensed into bullets
 * that sit above the numbered steps rather than in a section of their own.
 * The three large cards in the hero already show the detail (subjects,
 * aircraft, trainers); these three lines are the one-sentence version for
 * someone reading rather than scanning cards.
 */
const PILLARS = [
  "EASA ATPL Ground School theory, free in full, system by system.",
  "Aircraft systems for your type rating or class rating, aircraft by aircraft.",
  "Interactive sim trainers for the procedures worth seeing, not memorising.",
];

const STEPS = [
  {
    title: "Create a free account",
    detail:
      "Practising itself never requires one — but signing up means every answer is saved as you give it, so an abandoned test still counts and a refresh resumes rather than restarts.",
  },
  {
    title: "Study system by system, with instant explanations",
    detail:
      "Pick one system or several. In Study mode the correct answer and the reasoning appear the moment you answer each question, not at the end.",
  },
  {
    title: "Sit a timed mock exam",
    detail:
      "Exam mode holds every answer back until Finish and gives you one minute a question — the same pressure as the real thing, with nothing shown until it hands itself in.",
  },
  {
    title: "Track mastery and close your gaps",
    detail:
      "Your progress report breaks performance down by system and collects the questions you most recently got wrong, so you know exactly what to study next.",
  },
];

export function HowItWorks() {
  return (
    <section>
      <SectionHeading
        eyebrow="How it works"
        title="From first question to exam-ready"
        subtitle="Three ways to study, one way to learn — understand the aircraft and the exam, not just the answers."
      />

      <ul className="mx-auto mt-6 flex max-w-3xl flex-col gap-2 sm:flex-row sm:justify-center sm:gap-6">
        {PILLARS.map((pillar) => (
          <li
            key={pillar}
            className="flex items-start gap-2 text-sm text-muted-foreground sm:max-w-[15rem]"
          >
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-ink" aria-hidden="true" />
            {pillar}
          </li>
        ))}
      </ul>

      <ol className="mx-auto mt-10 grid max-w-3xl gap-6 border-t border-border pt-10 sm:grid-cols-2">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-on-solid">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
