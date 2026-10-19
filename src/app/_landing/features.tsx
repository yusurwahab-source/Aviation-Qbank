import { Card } from "@/components/ui";

import { SectionHeading } from "./section-heading";

/**
 * Each feature is an icon and a short title; the detail folds away under it
 * so the grid scans at a glance on a phone. Every line is something the app
 * does today — flags and notes exist now, and the service worker still only
 * caches static assets (see `public/sw.js`), so nothing here claims offline use.
 */
const FEATURES = [
  {
    title: "Instant explanations",
    icon: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z",
    detail:
      "In Study mode, the correct answer and the reasoning appear the moment you answer — not after you finish the whole test.",
  },
  {
    title: "Study and Exam modes",
    icon: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
    detail:
      "Study marks each question as you go with no clock. Exam holds everything back and gives you sixty seconds a question.",
  },
  {
    title: "Automatic retry list",
    icon: "M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5",
    detail:
      "Every question whose most recent answer was wrong is collected for you. Get it right on a retry and it drops off.",
  },
  {
    title: "Flags and notes",
    icon: "M5 21V4M5 4h11l-2 4 2 4H5",
    detail:
      "Flag any question and keep a private note on it. Both save as you type, and each turns into an instant test.",
  },
  {
    title: "Resume where you left off",
    icon: "M8 5v14l11-7z",
    detail:
      "Signed in, every answer saves the instant you give it. Refresh mid-test, or come back tomorrow, and it picks up.",
  },
  {
    title: "Progress by system",
    icon: "M4 20V10M10 20V4M16 20v-8M22 20H2",
    detail:
      "Your report breaks your score down by system and flags the weak ones, so you know which chapter needs another pass.",
  },
];

export function Features() {
  return (
    <section>
      <SectionHeading eyebrow="Features" title="What you actually get" />

      <ul className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <li key={feature.title}>
            <Card className="h-full p-0">
              <details className="group p-4">
                <summary className="tap-target flex cursor-pointer list-none flex-col items-start gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d={feature.icon} />
                    </svg>
                  </span>
                  <span className="text-sm font-semibold text-foreground">{feature.title}</span>
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{feature.detail}</p>
              </details>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
