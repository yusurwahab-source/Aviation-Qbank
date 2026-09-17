import { describe, expect, it } from "vitest";

import { computeIpnHash, verifyIpnSignature } from "@/lib/billing/2checkout-ipn";

// Known-answer values computed independently with Node's own crypto module
// for the source string "118COMPLETE10John Smith0" (fields "1", "COMPLETE",
// "John Smith", "" — the last encoding to the single character "0") and the
// secret "s3cr3t", so this checks the implementation against a value it did
// not produce itself.
const SECRET = "s3cr3t";
const VALUES = ["1", "COMPLETE", "John Smith", ""];
const EXPECTED_SHA256 = "539a1bb3359d3b236d7e5aac716352b8570d06d558984ea8078fba00ce025c8b";
const EXPECTED_SHA3_256 = "12f57f880a1e4942760dfc79dc996b3c5b3cd881a403e0fba45d6b369f4a19d6";

describe("computeIpnHash", () => {
  it("matches an independently computed HMAC-SHA256", () => {
    expect(computeIpnHash(VALUES, SECRET, "sha256")).toBe(EXPECTED_SHA256);
  });

  it("matches an independently computed HMAC-SHA3-256", () => {
    expect(computeIpnHash(VALUES, SECRET, "sha3-256")).toBe(EXPECTED_SHA3_256);
  });

  it("encodes a value that is literally '0' with its length, not as empty", () => {
    // "0" -> byte length 1 -> "10", never collapsing to the same encoding as
    // an actually-missing field, which is the bare digit "0".
    const withLiteralZero = computeIpnHash(["0"], SECRET);
    const withEmpty = computeIpnHash([""], SECRET);
    const withNull = computeIpnHash([null], SECRET);
    expect(withLiteralZero).not.toBe(withEmpty);
    expect(withEmpty).toBe(withNull);
  });

  it("is sensitive to field order, not just field contents", () => {
    expect(computeIpnHash(["a", "b"], SECRET)).not.toBe(computeIpnHash(["b", "a"], SECRET));
  });
});

describe("verifyIpnSignature", () => {
  function withHash(pairs: [string, string][], secret = SECRET): [string, string][] {
    const hash = computeIpnHash(
      pairs.map(([, value]) => value),
      secret,
    );
    return [...pairs, ["HASH", hash]];
  }

  it("accepts a payload whose HASH matches its other fields", () => {
    const pairs = withHash([
      ["CODE", "1"],
      ["MESSAGE", "COMPLETE"],
      ["NAME", "John Smith"],
      ["NOTE", ""],
    ]);
    expect(verifyIpnSignature(pairs, SECRET)).toBe(true);
  });

  it("rejects a payload with no HASH field at all", () => {
    expect(verifyIpnSignature([["CODE", "1"]], SECRET)).toBe(false);
  });

  it("rejects a tampered field even though HASH is present", () => {
    const pairs = withHash([
      ["CODE", "1"],
      ["MESSAGE", "COMPLETE"],
    ]);
    const tampered = pairs.map(([key, value]) =>
      key === "CODE" ? ([key, "999"] as [string, string]) : ([key, value] as [string, string]),
    );
    expect(verifyIpnSignature(tampered, SECRET)).toBe(false);
  });

  it("rejects a payload signed with the wrong secret", () => {
    const pairs = withHash([["CODE", "1"]], "the-real-secret");
    expect(verifyIpnSignature(pairs, "a-guessed-secret")).toBe(false);
  });

  it("is not fooled by fields reordered after signing", () => {
    const pairs = withHash([
      ["CODE", "1"],
      ["MESSAGE", "COMPLETE"],
    ]);
    const [a, b, hash] = pairs;
    expect(verifyIpnSignature([b, a, hash], SECRET)).toBe(false);
  });
});
