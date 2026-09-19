import { Badge } from "@/components/ui";

const CHIPS = ["FCOM-sourced", "Study and Exam modes", "Works on your phone"];

/**
 * The honest alternative to a testimonial wall: there are no reviews or
 * pass-rate figures to show yet, so this says plainly who built the bank and
 * how, rather than leaving the section out or filling it with claims nobody
 * has made.
 */
export function Trust() {
  return (
    <section className="mx-auto max-w-2xl text-center">
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
        Built by a commercial pilot with a Frozen EASA ATPL. Every question is written from FCOM
        source material — not from leaked exam papers or question banks passed around between
        students — and each one is checked to cover a single distinct fact, so you are never
        answering the same point twice under different wording.
      </p>

      <ul className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {CHIPS.map((chip) => (
          <li key={chip}>
            <Badge tone="brand">{chip}</Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
