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
