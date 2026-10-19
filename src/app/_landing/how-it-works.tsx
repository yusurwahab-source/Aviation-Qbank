import { SectionHeading } from "./section-heading";

const STEPS = [
  {
    title: "Create a free account",
    detail:
      "Practising never requires one, but with an account every answer is saved as you give it, so a refresh resumes.",
  },
  {
    title: "Study system by system, with instant explanations",
    detail:
      "Pick one system or several. In Study mode the answer and the reasoning appear the moment you answer.",
  },
  {
    title: "Sit a timed mock exam",
    detail:
      "Exam mode holds every answer back until Finish and gives you one minute a question.",
  },
  {
    title: "Track mastery and close your gaps",
    detail:
      "Your report breaks performance down by system and collects the questions you got wrong, so you know what to study next.",
  },
];

export function HowItWorks() {
  return (
    <section>
      <SectionHeading eyebrow="How it works" title="From first question to exam-ready" />

      <ol className="mx-auto mt-8 grid max-w-3xl gap-6 sm:grid-cols-2">
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
