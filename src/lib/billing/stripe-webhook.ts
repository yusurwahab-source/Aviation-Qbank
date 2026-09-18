import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifying a Stripe webhook.
 *
 * This is the one place a webhook is allowed to change who has access, so it
 * is the one place that must never trust a payload on its say-so. Stripe
 * signs every webhook with an HMAC-SHA256 over `{timestamp}.{raw body}`,
 * using the endpoint's own signing secret; a payload that does not reproduce
 * it did not come from Stripe, whatever it claims.
 *
 * Pure and dependency-free — like `password.ts` — so it can be exercised
 * with known values in a unit test rather than only against a live account.
 * No `stripe` package needed: this is the whole of what its
 * `webhooks.constructEvent` does.
 */

export type SignatureVerification =
  | { valid: true }
  | {
      valid: false;
      reason: "malformed-header" | "no-matching-signature" | "timestamp-too-old";
    };

/** Stripe's own default tolerance for how stale a signed request may be. */
const DEFAULT_TOLERANCE_SECONDS = 300;

/**
 * `Stripe-Signature` looks like `t=1614556800,v1=abcd...,v1=ef01...`. A
 * second `v1` appears while a signing secret is being rotated, and an
 * unrelated `v0` (an older scheme) is simply ignored — this reads every
 * `v1` value, and any one of them matching is enough.
 */
function parseSignatureHeader(header: string): { timestamp: string; signatures: string[] } | null {
  let timestamp: string | null = null;
  const signatures: string[] = [];

  for (const part of header.split(",")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "t" && value) timestamp = value;
    else if (key === "v1" && value) signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return null;
  return { timestamp, signatures };
}

/** Constant-time hex comparison, so a mismatch cannot be timed into a match. */
function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Checks a `Stripe-Signature` header against an HMAC computed from the raw
 * request body and the endpoint's signing secret.
 *
 * `rawBody` must be the exact bytes Stripe sent — re-serialising a parsed
 * JSON object is not guaranteed to reproduce the same bytes (key order,
 * spacing), which would silently break the signature. The caller must read
 * the request body as text before anything parses it.
 *
 * The timestamp check exists so a captured, genuinely-signed request cannot
 * be replayed indefinitely; `toleranceSeconds` and `now` are parameters
 * rather than hidden globals so this stays a pure function to test.
 */
export function verifyStripeSignature(
  rawBody: string,
  header: string,
  secret: string,
  toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS,
  now: number = Date.now(),
): SignatureVerification {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return { valid: false, reason: "malformed-header" };

  const signedPayload = `${parsed.timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  const matches = parsed.signatures.some((signature) => hashesMatch(expected, signature));
  if (!matches) return { valid: false, reason: "no-matching-signature" };

  const ageSeconds = Math.abs(now / 1000 - Number(parsed.timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > toleranceSeconds) {
    return { valid: false, reason: "timestamp-too-old" };
  }

  return { valid: true };
}
