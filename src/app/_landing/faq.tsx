import Link from "next/link";
import type { ReactNode } from "react";

import { SectionHeading } from "./section-heading";

const ENTRIES: { question: string; answer: ReactNode }[] = [
  {
    question: "Is this based on real exam questions?",
    answer: (
      <>
        No — and it shouldn&rsquo;t be. Every question is written from each aircraft&rsquo;s own
        official manuals — the FCOM and FCTM for a type rating, the AFM for a class rating — not
        copied from leaked exam papers or the question banks that circulate between students.
        Wrong answers are close calls rather than obviously silly ones, and the correct answer is
        spread evenly across every option, so you can&rsquo;t learn the pattern instead of the
        aircraft.
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
        Yes — that is the intent. This is practice material built from the FCOM and FCTM, never a
        substitute for either. If anything here ever seems to disagree with your own aircraft&rsquo;s
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
        <Link href="/contact" className="font-medium text-brand hover:underline">
          the contact page
        </Link>{" "}
        reaches the person who maintains the content. Questions live as files and ship the moment
        a fix is merged, so a reported error does not sit for long.
      </>
    ),
  },
];

export function Faq() {
  return (
    <section>
      <SectionHeading eyebrow="FAQ" title="Before you start" />

      <div className="mx-auto mt-8 max-w-2xl divide-y divide-border rounded-xl border border-border bg-surface">
        {ENTRIES.map((entry) => (
          <details key={entry.question} className="group p-4 open:pb-4 sm:p-5">
            <summary className="tap-target flex cursor-pointer list-none items-center justify-between gap-4 marker:content-none">
              <span className="text-sm font-medium text-foreground">{entry.question}</span>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
