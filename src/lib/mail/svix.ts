import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Checking that a webhook really came from the mail provider.
 *
 * Resend signs its webhooks with the Svix scheme. The signed text is
 * `<svix-id>.<svix-timestamp>.<raw body>`, the key is the base64 part of the
 * endpoint's `whsec_…` secret, and the header carries one or more
 * space-separated `v1,<base64 HMAC-SHA256>` entries (more than one while a
 * secret is being rotated). Written out here, in the same spirit as
 * `verifyStripeSignature`, so no package is installed for sixty lines of
 * arithmetic — and pure, so every way it can say no is tested.
 *
 * The timestamp is checked too: a genuinely signed request replayed a day
 * later is still a replay.
 */

export const SVIX_TOLERANCE_SECONDS = 5 * 60;

export type SvixResult = { valid: true } | { valid: false; reason: string };

export function verifySvixSignature(input: {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  body: string;
  secret: string;
  /** Milliseconds since the epoch; injectable for tests. */
  now?: number;
}): SvixResult {
  const { id, timestamp, signature, body, secret } = input;
  if (!id || !timestamp || !signature) return { valid: false, reason: "missing headers" };

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return { valid: false, reason: "bad timestamp" };
  const now = (input.now ?? Date.now()) / 1000;
  if (Math.abs(now - sentAt) > SVIX_TOLERANCE_SECONDS) return { valid: false, reason: "timestamp outside tolerance" };

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  if (key.length === 0) return { valid: false, reason: "unusable secret" };

  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();

  for (const entry of signature.split(" ")) {
    const [version, value] = entry.split(",");
    if (version !== "v1" || !value) continue;
    const candidate = Buffer.from(value, "base64");
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) return { valid: true };
  }
  return { valid: false, reason: "no signature matched" };
}
