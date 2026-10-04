/**
 * What the upgrade prompt says a subscription costs.
 *
 * The prices themselves live in Stripe (see "Checkout is a page Stripe
 * hosts" in CLAUDE.md), which is why `/pricing` does not state them. This is
 * display text for the prompt only: it has to be edited by hand whenever the
 * monthly Price changes, and the figure Stripe charges is always the one
 * that wins. The live monthly Price is €9.99 with `tax_behavior: inclusive`,
 * so that is what a student pays, VAT taken out of it.
 *
 * The quarterly plan is deliberately not priced here — `/upgrade` shows it.
 */
export const UPGRADE_PROMPT_PRICE = {
  amount: "€9.99",
  period: "per month",
  note: "VAT included · cancel any time",
} as const;

/**
 * What a subscription adds, in one place so the upgrade dialog and
 * `/pricing` can never describe it differently.
 *
 * Only the first two are things a subscription actually unlocks: the cap on
 * questions is the one thing a free account hits. The tools work on a free
 * account too — they simply stop being interrupted — and the third item says
 * outright that Pilot Sims and Flying Knowledge cost nothing, because they
 * do not. Writing them up as paid features would be untrue.
 */
export function subscriptionBenefits(freeQuestions: number): { title: string; body: string }[] {
  return [
    {
      title: "Every subject, with no cap",
      body: `Unlimited questions in every Type Rating and Class Rating bank, including aircraft added later. Free accounts stop at ${freeQuestions} per aircraft.`,
    },
    {
      title: "Every tool, all the way through a test",
      body: "Study and timed exam modes, an explanation for every question, flags and notes, weak-systems and unseen-question tests, and your full progress report.",
    },
    {
      title: "Simulators and Flying Knowledge alongside",
      body: "Pilot Sims and the Flying Knowledge subjects are part of your account too — and free for everyone, subscribed or not.",
    },
  ];
}
