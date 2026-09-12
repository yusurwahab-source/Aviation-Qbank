import { describe, expect, it } from "vitest";

import {
  DEFAULT_SCRYPT_PARAMS,
  hashPassword,
  needsRehash,
  unmatchableHash,
  verifyPassword,
} from "@/lib/password";

/**
 * Hashing at the real cost takes about half a second per call by design, so
 * these tests use cheap parameters. The behaviour under test — the encoding,
 * the comparison, the rehash rule — is identical either way.
 */
const FAST = { N: 1024, r: 8, p: 1 } as const;

describe("hashPassword", () => {
  it("never stores the password itself", async () => {
    const stored = await hashPassword("correct horse battery staple", FAST);
    expect(stored).not.toContain("correct horse battery staple");
  });

  it("records the parameters it used, so the cost can be raised later", async () => {
    const stored = await hashPassword("a-password", FAST);
    expect(stored.startsWith("scrypt$1024$8$1$")).toBe(true);
    expect(stored.split("$")).toHaveLength(6);
  });

  it("produces a different hash every time, so equal passwords are not equal rows", async () => {
    const a = await hashPassword("same-password", FAST);
    const b = await hashPassword("same-password", FAST);
    expect(a).not.toBe(b);
  });
});

describe("verifyPassword", () => {
  it("accepts the right password", async () => {
    const stored = await hashPassword("right-password", FAST);
    expect(await verifyPassword("right-password", stored)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("right-password", FAST);
    expect(await verifyPassword("wrong-password", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
    expect(await verifyPassword("right-passwor", stored)).toBe(false);
    expect(await verifyPassword("Right-Password", stored)).toBe(false);
  });

  it("handles passwords with spaces, unicode and emoji unchanged", async () => {
    for (const password of ["a long pass phrase", "كلمة السر الطويلة", "flying 🛩 high"]) {
      const stored = await hashPassword(password, FAST);
      expect(await verifyPassword(password, stored)).toBe(true);
      expect(await verifyPassword(`${password} `, stored)).toBe(false);
    }
  });

  it("returns false rather than throwing on a corrupt stored hash", async () => {
    for (const corrupt of [
      "",
      "not-a-hash",
      "scrypt$1024$8$1$onlyfourparts",
      "bcrypt$1024$8$1$c2FsdA$aGFzaA",
      "scrypt$0$8$1$c2FsdA$aGFzaA", // N must be a power of two above 1
      "scrypt$1000$8$1$c2FsdA$aGFzaA", // not a power of two
      "scrypt$1024$8$1$$aGFzaA", // empty salt
    ]) {
      expect(await verifyPassword("anything", corrupt)).toBe(false);
    }
  });

  it("never matches the unmatchable hash used for unknown emails", async () => {
    const stored = unmatchableHash(FAST);
    expect(await verifyPassword("", stored)).toBe(false);
    expect(await verifyPassword("any-password-at-all", stored)).toBe(false);
  });

  it("still verifies a hash made with older, cheaper parameters", async () => {
    const old = await hashPassword("unchanged", { N: 256, r: 8, p: 1 });
    expect(await verifyPassword("unchanged", old)).toBe(true);
  });
});

describe("needsRehash", () => {
  it("flags a hash made with weaker parameters", async () => {
    const weak = await hashPassword("p", { N: 256, r: 8, p: 1 });
    expect(needsRehash(weak, FAST)).toBe(true);
  });

  it("leaves a hash at the current parameters alone", async () => {
    const current = await hashPassword("p", FAST);
    expect(needsRehash(current, FAST)).toBe(false);
  });

  it("treats a corrupt hash as needing a rehash", () => {
    expect(needsRehash("nonsense", FAST)).toBe(true);
  });

  it("does not flag the parameters the application actually uses", async () => {
    // Cheap to check without hashing: the encoded header is enough.
    const { N, r, p } = DEFAULT_SCRYPT_PARAMS;
    expect(needsRehash(`scrypt$${N}$${r}$${p}$c2FsdA$aGFzaA`)).toBe(false);
  });
});
