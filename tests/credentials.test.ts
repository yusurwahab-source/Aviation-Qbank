import { describe, expect, it } from "vitest";

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  logInSchema,
  normaliseEmail,
  signUpSchema,
} from "@/lib/auth/credentials";

describe("normaliseEmail", () => {
  it("trims and lowercases so one address cannot become two accounts", () => {
    expect(normaliseEmail("  Yusur@Example.COM ")).toBe("yusur@example.com");
    expect(normaliseEmail("yusur@example.com")).toBe("yusur@example.com");
  });
});

describe("signUpSchema", () => {
  const valid = { email: "pilot@example.com", password: "a-good-password" };

  it("accepts a valid email and password", () => {
    const result = signUpSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("normalises the email it returns", () => {
    const result = signUpSchema.safeParse({ ...valid, email: " Pilot@Example.com " });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("pilot@example.com");
  });

  it("rejects an address that is not an email", () => {
    for (const email of ["", "  ", "pilot", "pilot@", "@example.com", "pilot example.com"]) {
      expect(signUpSchema.safeParse({ ...valid, email }).success).toBe(false);
    }
  });

  it(`rejects a password shorter than ${MIN_PASSWORD_LENGTH} characters`, () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    const result = signUpSchema.safeParse({ ...valid, password: short });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain(String(MIN_PASSWORD_LENGTH));
  });

  it("accepts a password of exactly the minimum length", () => {
    const exact = "a".repeat(MIN_PASSWORD_LENGTH);
    expect(signUpSchema.safeParse({ ...valid, password: exact }).success).toBe(true);
  });

  it("rejects an absurdly long password, which would be expensive to hash", () => {
    const huge = "a".repeat(MAX_PASSWORD_LENGTH + 1);
    expect(signUpSchema.safeParse({ ...valid, password: huge }).success).toBe(false);
  });

  it("does not impose symbol or capital rules", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "all lower case words" }).success).toBe(
      true,
    );
  });
});

describe("logInSchema", () => {
  it("accepts a short password, so old accounts are not locked out by new rules", () => {
    const result = logInSchema.safeParse({ email: "pilot@example.com", password: "short" });
    expect(result.success).toBe(true);
  });

  it("still requires a password to be typed", () => {
    expect(logInSchema.safeParse({ email: "pilot@example.com", password: "" }).success).toBe(
      false,
    );
  });

  it("still refuses an oversized password", () => {
    const huge = "a".repeat(MAX_PASSWORD_LENGTH + 1);
    expect(logInSchema.safeParse({ email: "pilot@example.com", password: huge }).success).toBe(
      false,
    );
  });
});
