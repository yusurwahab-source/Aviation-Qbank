/**
 * Building a ConvertPlus checkout link.
 *
 * Pure and untested-by-network on purpose: this only assembles a URL. The
 * catalog products themselves — one per plan, each with its price already set
 * — are configured once in the 2Checkout merchant control panel, not here;
 * see the note in CLAUDE.md on what that setup step involves.
 */

const CHECKOUT_BASE_URL = "https://secure.2checkout.com/checkout/buy";

export const CHECKOUT_PLANS = ["monthly", "yearly"] as const;
export type CheckoutPlan = (typeof CHECKOUT_PLANS)[number];

/** Joins a user id and a plan into the one opaque string 2Checkout will hand back unchanged. */
const ORDER_REF_SEPARATOR = ":";

/**
 * What identifies *our* side of a checkout, carried through as `order-ext-ref`
 * and returned unchanged on every IPN for that order — including the renewal
 * notifications sent long after the browser that started the checkout is
 * gone. There is nothing secret in it: it is the IPN it comes back on that is
 * authenticated, by its HMAC signature, not this value.
 */
export function buildOrderExtRef(userId: string, plan: CheckoutPlan): string {
  return `${userId}${ORDER_REF_SEPARATOR}${plan}`;
}

/** The inverse of `buildOrderExtRef`. Null for anything that is not one we minted. */
export function parseOrderExtRef(value: string): { userId: string; plan: CheckoutPlan } | null {
  const separatorIndex = value.indexOf(ORDER_REF_SEPARATOR);
  if (separatorIndex === -1) return null;

  const userId = value.slice(0, separatorIndex);
  const plan = value.slice(separatorIndex + 1);
  if (!userId || !CHECKOUT_PLANS.includes(plan as CheckoutPlan)) return null;

  return { userId, plan: plan as CheckoutPlan };
}

/**
 * The hosted checkout page for one plan.
 *
 * `productId` is the catalog product code configured for that plan in the
 * 2Checkout control panel — its price lives there, not in this call, so a
 * price change is a dashboard edit, never a deploy.
 */
export function buildCheckoutUrl(input: {
  merchantCode: string;
  productId: string;
  orderExtRef: string;
  email?: string;
  returnUrl?: string;
  /** True outside production, so test purchases never touch a real card. */
  sandbox?: boolean;
}): string {
  const params = new URLSearchParams({
    merchant: input.merchantCode,
    prod: input.productId,
    "order-ext-ref": input.orderExtRef,
  });
  if (input.email) params.set("email", input.email);
  if (input.returnUrl) params.set("return-url", input.returnUrl);
  if (input.sandbox) params.set("test", "1");

  return `${CHECKOUT_BASE_URL}?${params.toString()}`;
}
