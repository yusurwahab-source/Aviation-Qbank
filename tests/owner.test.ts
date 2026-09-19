import { describe, expect, it } from "vitest";

import { isOwner } from "@/lib/auth/owner";

describe("isOwner", () => {
  it("is false when no owner email is configured", () => {
    expect(isOwner("someone@example.com", null)).toBe(false);
  });

  it("is true for an exact match", () => {
    expect(isOwner("owner@example.com", "owner@example.com")).toBe(true);
  });

  it("is case-insensitive, matching how emails are stored", () => {
    expect(isOwner("owner@example.com", "Owner@Example.com")).toBe(true);
  });

  it("ignores surrounding whitespace on the configured value", () => {
    expect(isOwner("owner@example.com", " owner@example.com ")).toBe(true);
  });

  it("is false for anyone else", () => {
    expect(isOwner("student@example.com", "owner@example.com")).toBe(false);
  });
});
