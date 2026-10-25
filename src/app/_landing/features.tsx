import { Card } from "@/components/ui";

import { SectionHeading } from "./section-heading";

/**
 * Six real mechanics, each with the one-line benefit it actually gives you —
 * not the six-feature list a template would suggest. A few names differ from
 * the obvious marketing shorthand ("flag and revisit", "personal notes",
 * "works offline") because this product does not do those things yet: there
 * is no flag on a question, no per-question notes field, and the service
 * worker deliberately never caches a page or a question, only static
 * assets — see `public/sw.js`. Every line below is something the app
 * actually does today.
 */
const FEATURES = [
  {
    title: "Instant explanations",
    detail:
      "In Study mode, the correct answer and the reasoning appear the moment you answer — not after you finish the whole test.",
  },
  {
    title: "Study and Exam modes",
    detail:
      "Study marks each question as you go with no clock. Exam holds everything back and gives you sixty seconds a question, the same as the real thing.",
  },
  {
    title: "A retry list you never have to build",
    detail:
      "Every question whose most recent answer was wrong is collected automatically. Get it right on a retry and it drops off — no flag to remember to set.",
  },
  {
    title: "Resume exactly where you left off",
    detail:
      "Signed in, every answer saves the instant you give it. Refresh mid-test, or come back tomorrow, and it picks up rather than starting over.",
  },
  {
    title: "Per-system mastery tracking",
    detail:
      "Your progress report breaks your score down by system, so you know which chapter needs another pass before the one that matters.",
  },
  {
    title: "Built for your phone",
    detail:
      "Installable to your home screen, with every control sized for a thumb, not a mouse — checked at 375px, not just assumed to work there.",
  },
];

export function Features() {
  return (
    <section>
      <SectionHeading eyebrow="Features" title="What you actually get" />

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <li key={feature.title}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:border-brand hover:shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold text-brand-ink">
                {index + 1}
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">{feature.title}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{feature.detail}</p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
