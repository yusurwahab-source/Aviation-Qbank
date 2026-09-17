import "server-only";

import { upsertSubscription } from "@/db/subscriptions";
import { parseOrderExtRef } from "@/lib/billing/2checkout";
import { verifyIpnSignature } from "@/lib/billing/2checkout-ipn";
import { periodEndFor, subscriptionStatusForOrderStatus } from "@/lib/billing/access-policy";

/**
 * Where 2Checkout tells this app that a payment happened.
 *
 * This is the one place outside the merchant's own control panel that can
 * turn a subscription on, so nothing here is acted on until
 * `verifyIpnSignature` has confirmed the request was actually signed with
 * this account's secret key. Anything that fails that check is answered and
 * dropped, never processed "just in case".
 *
 * **Field names below are the ones 2Checkout's classic IPN system documents
 * (`ORDERSTATUS`, `MESSAGE_TYPE`, `REFNOEXT`), not ones confirmed against a
 * live payload from this project's own account.** Setting the account up for
 * real is the point at which to check them: the 2Checkout control panel can
 * send a real IPN to this endpoint, and its `console.warn` below logs the
 * full payload whenever a field it expected is missing, so a mismatch shows
 * up immediately rather than silently doing nothing. See the note in
 * CLAUDE.md.
 */
export async function POST(request: Request): Promise<Response> {
  const secretKey = process.env.TWOCHECKOUT_SECRET_KEY;
  if (!secretKey) {
    console.error("Received a 2Checkout webhook but TWOCHECKOUT_SECRET_KEY is not set.");
    // 500, not 200: this is a deployment that cannot process payments yet,
    // and 2Checkout should keep retrying until it is fixed.
    return new Response("Not configured", { status: 500 });
  }

  const rawBody = await request.text();
  // `URLSearchParams` preserves the order fields were posted in, which the
  // signature depends on — a plain parsed object's key order is not a
  // promise worth leaning on here.
  const fields = new URLSearchParams(rawBody);

  if (!verifyIpnSignature(fields, secretKey)) {
    console.warn("2Checkout webhook signature did not verify; ignoring the request.");
    return new Response("Invalid signature", { status: 401 });
  }

  const orderExtRef = fields.get("REFNOEXT");
  const orderStatus = fields.get("ORDERSTATUS") ?? fields.get("MESSAGE_TYPE");
  const providerSubscriptionRef = fields.get("SALEID") ?? fields.get("REFNO");

  // A 200 here, not an error, in every branch below that does not act: this
  // request was genuinely from 2Checkout, so the honest response is "seen",
  // even when there was nothing this app knew how to do with it. Answering
  // with an error would only earn a retry of the same unrecognised payload.
  if (!orderExtRef || !orderStatus) {
    console.warn(
      "2Checkout webhook missing an expected field:",
      Object.fromEntries(fields.entries()),
    );
    return new Response("OK", { status: 200 });
  }

  const parsedRef = parseOrderExtRef(orderExtRef);
  if (!parsedRef) {
    console.warn(`2Checkout webhook order-ext-ref '${orderExtRef}' is not one this app issued.`);
    return new Response("OK", { status: 200 });
  }

  const status = subscriptionStatusForOrderStatus(orderStatus);
  // PENDING, PROCESSING, and anything else not yet final: nothing to record.
  if (status === null) {
    return new Response("OK", { status: 200 });
  }

  await upsertSubscription({
    userId: parsedRef.userId,
    plan: parsedRef.plan,
    status,
    providerSubscriptionRef,
    currentPeriodEnd: status === "active" ? periodEndFor(parsedRef.plan) : null,
  });

  return new Response("OK", { status: 200 });
}
