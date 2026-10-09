import { describe, expect, it } from "vitest";

import { buildSitemapEntries } from "@/lib/seo/sitemap-entries";

const sections = {
  aircraft: [
    { code: "B737", status: "active" as const },
    { code: "A320", status: "coming_soon" as const },
  ],
  classRatings: [{ code: "DA40", status: "active" as const }],
  flyingKnowledgeSubjects: [
    { code: "POF", status: "active" as const },
    { code: "MET", status: "coming_soon" as const },
  ],
};

describe("buildSitemapEntries", () => {
  it("includes the home page and the three section pickers", () => {
    const urls = buildSitemapEntries("https://example.com", sections).map(
      (entry) => entry.url,
    );

    expect(urls).toContain("https://example.com/");
    expect(urls).toContain("https://example.com/type-rating");
    expect(urls).toContain("https://example.com/class-rating");
    expect(urls).toContain("https://example.com/flying-knowledge");
  });

  it("includes Pilot Sims and its simulators", () => {
    const urls = buildSitemapEntries("https://example.com", sections).map(
      (entry) => entry.url,
    );

    expect(urls).toContain("https://example.com/pilot-sims");
    expect(urls).toContain(
      "https://example.com/pilot-sims/holding-pattern-entry-trainer",
    );
    expect(urls).toContain("https://example.com/pilot-sims/vor-ndb-trainer");
  });

  it("includes an active row from every content tree, at its own uppercase code", () => {
    const urls = buildSitemapEntries("https://example.com", sections).map(
      (entry) => entry.url,
    );

    expect(urls).toContain("https://example.com/type-rating/B737");
    expect(urls).toContain("https://example.com/class-rating/DA40");
    expect(urls).toContain("https://example.com/flying-knowledge/POF");
  });

  it("never gives a coming-soon row a URL", () => {
    const urls = buildSitemapEntries("https://example.com", sections).map(
      (entry) => entry.url,
    );

    expect(urls).not.toContain("https://example.com/type-rating/A320");
    expect(urls).not.toContain("https://example.com/flying-knowledge/MET");
  });

  it("strips a trailing slash from the base URL rather than doubling it", () => {
    const urls = buildSitemapEntries("https://example.com/", sections).map(
      (entry) => entry.url,
    );

    expect(urls).toContain("https://example.com/");
    expect(urls.some((url) => url.includes("//type-rating"))).toBe(false);
  });

  it("never repeats a URL", () => {
    const urls = buildSitemapEntries("https://example.com", sections).map(
      (entry) => entry.url,
    );

    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("buildSitemapEntries with hidden sections", () => {
  it("leaves a hidden section's picker and detail pages out, and keeps the rest", () => {
    const urls = buildSitemapEntries("https://example.com", sections, [
      "type-rating",
      "pilot-sims",
    ]).map((entry) => entry.url);

    expect(urls.some((url) => url.includes("/type-rating"))).toBe(false);
    expect(urls.some((url) => url.includes("/pilot-sims"))).toBe(false);
    expect(urls).toContain("https://example.com/class-rating/DA40");
    expect(urls).toContain("https://example.com/flying-knowledge/POF");
  });
});
