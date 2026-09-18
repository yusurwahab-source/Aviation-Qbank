import { describe, expect, it } from "vitest";

import { readEnv } from "@/lib/env";

describe("readEnv", () => {
  it("returns a plain value unchanged", () => {
    expect(readEnv("STRIPE_SECRET_KEY", "sk_test_abc")).toBe("sk_test_abc");
  });

  it("is null when unset or empty", () => {
    expect(readEnv("STRIPE_SECRET_KEY", undefined)).toBeNull();
    expect(readEnv("STRIPE_SECRET_KEY", "")).toBeNull();
    expect(readEnv("STRIPE_SECRET_KEY", "   ")).toBeNull();
  });

  it("trims whitespace a dashboard field hides", () => {
    expect(readEnv("STRIPE_SECRET_KEY", "  sk_test_abc\n")).toBe("sk_test_abc");
  });

  it("strips a whole .env line pasted into a value-only field", () => {
    // The incident this exists for: the provider reported the key as
    // "STRIPE_S…" because the variable name was part of the value.
    expect(readEnv("STRIPE_SECRET_KEY", "STRIPE_SECRET_KEY=sk_test_abc")).toBe("sk_test_abc");
    expect(readEnv("STRIPE_SECRET_KEY", " STRIPE_SECRET_KEY = sk_test_abc ")).toBe("sk_test_abc");
  });

  it("matches the variable name case-insensitively when stripping it", () => {
    expect(readEnv("STRIPE_SECRET_KEY", "stripe_secret_key=sk_test_abc")).toBe("sk_test_abc");
  });

  it("strips quotes carried over from a .env file", () => {
    expect(readEnv("STRIPE_SECRET_KEY", '"sk_test_abc"')).toBe("sk_test_abc");
    expect(readEnv("STRIPE_SECRET_KEY", "'sk_test_abc'")).toBe("sk_test_abc");
    expect(readEnv("STRIPE_SECRET_KEY", 'STRIPE_SECRET_KEY="sk_test_abc"')).toBe("sk_test_abc");
  });

  it("leaves a mismatched or inner quote alone", () => {
    expect(readEnv("NAME", '"sk_test_abc')).toBe('"sk_test_abc');
    expect(readEnv("NAME", "sk_test_a\"b")).toBe('sk_test_a"b');
  });

  it("does not strip another variable's name", () => {
    expect(readEnv("STRIPE_SECRET_KEY", "OTHER_NAME=sk_test_abc")).toBe("OTHER_NAME=sk_test_abc");
  });

  it("is null when the line carried a name and nothing else", () => {
    expect(readEnv("STRIPE_SECRET_KEY", "STRIPE_SECRET_KEY=")).toBeNull();
  });
});
