import { Badge } from "@/components/ui";

const CHIPS = ["Exam-style questions", "Study and Exam modes", "Works on your phone"];

/**
 * The honest alternative to a testimonial wall: there are no reviews or
 * pass-rate figures to show yet, so this says plainly who built the bank and
 * how, rather than leaving the section out or filling it with claims nobody
 * has made.
 *
 * Chips are neutral, not accent-coloured. The accent means "do this next" or
 * "this is correct" everywhere else on the page; a row of yellow badges
 * here would borrow that same weight for a credibility statement, which is
 * exactly the confusion the token system exists to avoid.
 */
export function Trust() {
  return (
    <section className="mx-auto max-w-2xl text-center">
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
        Built by a commercial pilot with a Frozen EASA ATPL who has sat these exams. Questions are
        written to match the real exams in format, style and difficulty, and each one is checked to
        cover a single distinct fact, so you are never answering the same point twice under
        different wording.
      </p>

      <ul className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {CHIPS.map((chip) => (
          <li key={chip}>
            <Badge>{chip}</Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
