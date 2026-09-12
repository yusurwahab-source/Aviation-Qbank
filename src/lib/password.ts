import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing.
 *
 * Uses scrypt from Node's own crypto module — deliberately no dependency. scrypt
 * is memory-hard, so an attacker with a stolen database cannot test guesses
 * cheaply on a GPU the way they could against a plain SHA hash.
 *
 * Like grading, this is a pure module with no database and no React, so it can
 * be unit tested directly.
 */

/**
 * OWASP's stated minimum for scrypt: N=2^17, r=8, p=1 (about 128 MB and half a
 * second per hash). That cost is the point — it is paid only on sign up and log
 * in, and it is what makes a stolen database expensive to attack.
 */
export const DEFAULT_SCRYPT_PARAMS = { N: 131072, r: 8, p: 1 } as const;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export type ScryptParams = { N: number; r: number; p: number };

/**
 * Every hash carries the parameters it was made with:
 *
 *   scrypt$131072$8$1$<salt base64url>$<hash base64url>
 *
 * That is what lets the cost be raised later: old passwords still verify
 * against their original parameters, and `needsRehash` flags the ones to
 * upgrade the next time their owner logs in.
 */
function encode(params: ScryptParams, salt: Buffer, hash: Buffer): string {
  return [
    "scrypt",
    params.N,
    params.r,
    params.p,
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join("$");
}

type DecodedHash = { params: ScryptParams; salt: Buffer; hash: Buffer };

function decode(stored: string): DecodedHash | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;

  const [, rawN, rawR, rawP, rawSalt, rawHash] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);

  // Reject anything that would make scrypt throw or run unboundedly.
  if (!Number.isInteger(N) || N < 2 || (N & (N - 1)) !== 0) return null;
  if (!Number.isInteger(r) || r < 1 || r > 32) return null;
  if (!Number.isInteger(p) || p < 1 || p > 16) return null;

  try {
    const salt = Buffer.from(rawSalt, "base64url");
    const hash = Buffer.from(rawHash, "base64url");
    if (salt.length === 0 || hash.length === 0) return null;
    return { params: { N, r, p }, salt, hash };
  } catch {
    return null;
  }
}

function derive(
  password: string,
  salt: Buffer,
  params: ScryptParams,
  keyLength: number,
): Promise<Buffer> {
  // Node's default maxmem (32 MB) is below what these parameters need, so it is
  // raised explicitly with headroom rather than left to throw.
  const maxmem = 256 * params.N * params.r;

  // Wrapped by hand rather than with promisify, which resolves to scrypt's
  // three-argument overload and cannot be passed these options.
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, { ...params, maxmem }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

/** Hashes a password with a fresh random salt. */
export async function hashPassword(
  password: string,
  params: ScryptParams = DEFAULT_SCRYPT_PARAMS,
): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await derive(password, salt, params, KEY_LENGTH);
  return encode(params, salt, hash);
}

/**
 * Checks a password against a stored hash.
 *
 * Returns false rather than throwing for a malformed stored hash: a corrupt row
 * should fail a login, not crash the login page.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const decoded = decode(stored);
  if (!decoded) return false;

  try {
    const candidate = await derive(password, decoded.salt, decoded.params, decoded.hash.length);
    // Constant-time: a normal === would leak how much of the hash matched.
    return timingSafeEqual(candidate, decoded.hash);
  } catch {
    return false;
  }
}

/**
 * A well-formed hash that no password can match.
 *
 * Log in verifies against this when the email has no account, so that a wrong
 * email costs exactly as much time as a wrong password. Without it, a fast
 * rejection would tell an attacker which addresses are registered.
 *
 * Building it is free — the scrypt cost is paid by the `verifyPassword` call
 * that uses it, which is the whole point.
 */
export function unmatchableHash(params: ScryptParams = DEFAULT_SCRYPT_PARAMS): string {
  return encode(params, Buffer.alloc(SALT_LENGTH), Buffer.alloc(KEY_LENGTH));
}

/**
 * True when a stored hash was made with weaker parameters than we now use.
 * Call it after a successful login to re-hash and upgrade the stored password.
 */
export function needsRehash(
  stored: string,
  params: ScryptParams = DEFAULT_SCRYPT_PARAMS,
): boolean {
  const decoded = decode(stored);
  if (!decoded) return true;
  return (
    decoded.params.N < params.N || decoded.params.r < params.r || decoded.params.p < params.p
  );
}
