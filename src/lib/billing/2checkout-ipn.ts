import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifying a 2Checkout IPN (Instant Payment Notification).
 *
 * This is the one place a webhook is allowed to change who has access, so it
 * is the one place that must never trust a payload on its say-so. 2Checkout
 * signs every IPN with an HMAC computed from the posted values and the
 * merchant's own secret key ("Secret Word" in the control panel); a payload
 * that does not reproduce it did not come from 2Checkout, whatever it claims.
 *
 * Pure and dependency-free — like `password.ts` — so it can be exercised with
 * known values in a unit test rather than only against a live account.
 */

export type IpnHashAlgorithm = "sha256" | "sha3-256";

/**
 * One field's contribution to the HMAC source string: the empty or missing
 * value becomes the single character "0"; anything else becomes its UTF-8
 * byte length, in decimal, immediately followed by the value itself — so a
 * length that happens to read "0" (the one-character value `"0"`) still
 * encodes as `"10"`, never colliding with an actually-empty field.
 */
function encodeField(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  return `${Buffer.byteLength(value, "utf8")}${value}`;
}

/**
 * The HMAC 2Checkout expects in the `HASH` field, given the other fields'
 * *values*, in the exact order they were posted — the field names play no
 * part in the signature, only the sequence of values does.
 */
export function computeIpnHash(
  values: (string | null | undefined)[],
  secretKey: string,
  algorithm: IpnHashAlgorithm = "sha256",
): string {
  const source = values.map(encodeField).join("");
  return createHmac(algorithm, secretKey).update(source, "utf8").digest("hex");
}

/** Constant-time hex comparison, so a mismatch cannot be timed into a match. */
function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a.toLowerCase(), "utf8");
  const right = Buffer.from(b.toLowerCase(), "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Checks an incoming IPN's `HASH` field against one computed from its other
 * fields, in the order the request itself gave them.
 *
 * Takes the raw `[key, value]` pairs — e.g. straight from
 * `new URLSearchParams(rawBody)`, which preserves posted order — rather than
 * a parsed object, because a plain object's key order is not a promise this
 * code should lean on. `HASH` itself is excluded from what gets hashed, the
 * same way a MAC never signs its own tag.
 *
 * The algorithm must match what the merchant account is configured to sign
 * with (SHA-256 or SHA3-256, chosen in the 2Checkout control panel) — this
 * function does not guess between them.
 */
export function verifyIpnSignature(
  fields: Iterable<[string, string]>,
  secretKey: string,
  algorithm: IpnHashAlgorithm = "sha256",
): boolean {
  const values: string[] = [];
  let receivedHash: string | null = null;

  for (const [key, value] of fields) {
    if (key.toUpperCase() === "HASH") {
      receivedHash = value;
      continue;
    }
    values.push(value);
  }

  if (receivedHash === null || receivedHash === "") return false;

  const expected = computeIpnHash(values, secretKey, algorithm);
  return hashesMatch(expected, receivedHash);
}
