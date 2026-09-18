import { describe, expect, it } from "vitest";

import { verifyStripeSignature } from "@/lib/billing/stripe-webhook";

// Known-answer values computed independently with Node's own crypto module,
// for HMAC-SHA256("whsec_test_secret", "1614556800." + RAW_BODY) — so this
// checks the implementation against a value it did not produce itself.
const SECRET = "whsec_test_secret";
const TIMESTAMP = "1614556800";
const RAW_BODY = '{"id":"evt_test_123","type":"customer.subscription.updated"}';
const EXPECTED_SIGNATURE =
  "94ff91e74a492c4b7edf3fb1015c8e6e490c35429451fcfe4a594d9a79d12ab2";

// The timestamp above, in milliseconds, so "now" can be pinned near it.
const TIMESTAMP_MS = Number(TIMESTAMP) * 1000;

describe("verifyStripeSignature", () => {
  it("accepts a correctly signed, fresh request", () => {
    const header = `t=${TIMESTAMP},v1=${EXPECTED_SIGNATURE}`;
    const result = verifyStripeSignature(RAW_BODY, header, SECRET, 300, TIMESTAMP_MS);
    expect(result).toEqual({ valid: true });
  });

  it("rejects a body that does not match the signature", () => {
    const header = `t=${TIMESTAMP},v1=${EXPECTED_SIGNATURE}`;
    const result = verifyStripeSignature('{"id":"evt_tampered"}', header, SECRET, 300, TIMESTAMP_MS);
    expect(result).toEqual({ valid: false, reason: "no-matching-signature" });
  });

  it("rejects the right signature under the wrong secret", () => {
    const header = `t=${TIMESTAMP},v1=${EXPECTED_SIGNATURE}`;
    const result = verifyStripeSignature(RAW_BODY, header, "a-different-secret", 300, TIMESTAMP_MS);
    expect(result).toEqual({ valid: false, reason: "no-matching-signature" });
  });

  it("rejects a header with no v1 signature at all", () => {
    const result = verifyStripeSignature(RAW_BODY, `t=${TIMESTAMP}`, SECRET, 300, TIMESTAMP_MS);
    expect(result).toEqual({ valid: false, reason: "malformed-header" });
  });

  it("rejects a header with no timestamp", () => {
    const result = verifyStripeSignature(RAW_BODY, `v1=${EXPECTED_SIGNATURE}`, SECRET, 300, TIMESTAMP_MS);
    expect(result).toEqual({ valid: false, reason: "malformed-header" });
  });

  it("matches when any of several v1 values is correct (key rotation)", () => {
    const header = `t=${TIMESTAMP},v1=not-it,v1=${EXPECTED_SIGNATURE}`;
    const result = verifyStripeSignature(RAW_BODY, header, SECRET, 300, TIMESTAMP_MS);
    expect(result).toEqual({ valid: true });
  });

  it("rejects a genuinely signed request replayed well outside the tolerance", () => {
    const header = `t=${TIMESTAMP},v1=${EXPECTED_SIGNATURE}`;
    const farLater = TIMESTAMP_MS + 10 * 60 * 1000; // 10 minutes later
    const result = verifyStripeSignature(RAW_BODY, header, SECRET, 300, farLater);
    expect(result).toEqual({ valid: false, reason: "timestamp-too-old" });
  });

  it("accepts a request just inside the tolerance window", () => {
    const header = `t=${TIMESTAMP},v1=${EXPECTED_SIGNATURE}`;
    const justInside = TIMESTAMP_MS + 299 * 1000;
    const result = verifyStripeSignature(RAW_BODY, header, SECRET, 300, justInside);
    expect(result).toEqual({ valid: true });
  });
});
