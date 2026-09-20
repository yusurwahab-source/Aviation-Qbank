import { describe, expect, it } from "vitest";

import { resolveContentCategory } from "@/lib/content-categories";

describe("resolveContentCategory", () => {
  it("falls back to type-rating for unknown values", () => {
    expect(resolveContentCategory("unknown")).toBe("type-rating");
  });

  it("uses the first value when category appears multiple times", () => {
    expect(resolveContentCategory(["flying-knowledge", "type-rating"])).toBe("flying-knowledge");
  });
});
