import { describe, expect, it } from "vitest";

import { categoryQueryValue, resolveContentCategory } from "@/lib/content-categories";

describe("resolveContentCategory", () => {
  it("falls back to type-rating for unknown values", () => {
    expect(resolveContentCategory("unknown")).toBe("type-rating");
  });

  it("uses the first value when category appears multiple times", () => {
    expect(resolveContentCategory(["flying-knowledge", "type-rating"])).toBe("flying-knowledge");
  });

  it("accepts requested map aliases", () => {
    expect(resolveContentCategory("type-ratings")).toBe("type-rating");
    expect(resolveContentCategory("class-ratings")).toBe("light-aircraft");
    expect(resolveContentCategory("general-subjects")).toBe("flying-knowledge");
  });
});

describe("categoryQueryValue", () => {
  it("maps internal categories to public query values", () => {
    expect(categoryQueryValue("type-rating")).toBe("type-ratings");
    expect(categoryQueryValue("light-aircraft")).toBe("class-ratings");
    expect(categoryQueryValue("flying-knowledge")).toBe("general-subjects");
  });
});
