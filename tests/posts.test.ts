import { describe, expect, it } from "vitest";

import {
  formatReferences,
  isExternalUrl,
  isPubliclyVisible,
  isSafeHttpsUrl,
  isSafeImageSource,
  parseReferences,
  parseTags,
  postPath,
  readingMinutes,
  resolvePublishedAt,
  safeMarkdownUrl,
  slugify,
  validatePost,
  type RawPostFields,
} from "@/lib/posts";

const base: RawPostFields = {
  kind: "article",
  title: "How the VOR works",
  slug: "",
  excerpt: "A short guide.",
  body: "Some text.",
  coverImageUrl: "",
  coverImageAlt: "",
  category: "Theory",
  tags: "Radio navigation, VOR",
  references: "",
  sourceName: "",
  sourceUrl: "",
  sourcePublishedOn: "",
  publishedOn: "",
  featured: "",
  seoTitle: "",
  seoDescription: "",
};

describe("slugify", () => {
  it("makes a lowercase hyphenated address and folds accents", () => {
    expect(slugify("How the VOR Works")).toBe("how-the-vor-works");
    expect(slugify("  Météo & Icing: Part 2! ")).toBe("meteo-and-icing-part-2");
    expect(slugify("!!!")).toBe("");
  });
});

describe("links", () => {
  it("accepts only https URLs with a host", () => {
    expect(isSafeHttpsUrl("https://www.easa.europa.eu/")).toBe(true);
    expect(isSafeHttpsUrl("http://example.com")).toBe(false);
    expect(isSafeHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpsUrl("/blog")).toBe(false);
  });

  it("accepts a cover image from https or a site path, never protocol-relative", () => {
    expect(isSafeImageSource("/images/blog.webp")).toBe(true);
    expect(isSafeImageSource("https://cdn.example.com/a.jpg")).toBe(true);
    expect(isSafeImageSource("//evil.example/a.jpg")).toBe(false);
    expect(isSafeImageSource("data:image/png;base64,AAAA")).toBe(false);
  });
});

describe("tags and references", () => {
  it("splits tags on commas, trims and de-duplicates", () => {
    expect(parseTags(" VOR, ndb ,, VOR ,Holding ")).toEqual(["VOR", "ndb", "Holding"]);
  });

  it("reads one reference per line and reports every bad line", () => {
    const { references, errors } = parseReferences(
      [
        "Part-FCL | https://www.easa.europa.eu/part-fcl | EASA | 2024-01-15",
        "Annex 10 | https://www.icao.int/annex10",
        "No link | http://insecure.example",
        " | https://example.com",
        "Bad date | https://example.com | X | 2024-13-40",
      ].join("\n"),
    );
    expect(references).toEqual([
      { title: "Part-FCL", url: "https://www.easa.europa.eu/part-fcl", publisher: "EASA", date: "2024-01-15" },
      { title: "Annex 10", url: "https://www.icao.int/annex10" },
    ]);
    expect(errors).toHaveLength(3);
  });

  it("round-trips references through the editor's text", () => {
    const text = "A | https://a.example | P | 2024-01-01\nB | https://b.example";
    expect(formatReferences(parseReferences(text).references)).toBe(text);
  });
});

describe("validatePost", () => {
  it("fills a blank slug from the title and parses the lists", () => {
    const result = validatePost(base, "publish");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.slug).toBe("how-the-vor-works");
      expect(result.input.tags).toEqual(["Radio navigation", "VOR"]);
      expect(result.input.coverImageUrl).toBeNull();
      expect(result.input.featured).toBe(false);
    }
  });

  it("refuses a bad slug, an unsafe link and a missing title", () => {
    const result = validatePost(
      { ...base, title: "", slug: "Bad Slug", sourceUrl: "javascript:alert(1)" },
      "draft",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("needs alt text when there is a cover image", () => {
    const result = validatePost({ ...base, coverImageUrl: "https://cdn.example.com/a.jpg" }, "draft");
    expect(result.ok).toBe(false);
  });

  it("lets a draft have no text but not a published post", () => {
    expect(validatePost({ ...base, body: "" }, "draft").ok).toBe(true);
    expect(validatePost({ ...base, body: "  " }, "publish").ok).toBe(false);
  });

  it("refuses an unknown kind and an impossible date", () => {
    expect(validatePost({ ...base, kind: "page" }, "draft").ok).toBe(false);
    expect(validatePost({ ...base, publishedOn: "2026-02-30" }, "draft").ok).toBe(false);
  });
});

describe("publishing", () => {
  const now = new Date("2026-10-25T10:00:00Z");

  it("uses the chosen day, else the existing date, else now", () => {
    expect(resolvePublishedAt("2026-10-01", null, now).toISOString()).toBe("2026-10-01T00:00:00.000Z");
    const existing = new Date("2026-09-01T12:00:00Z");
    expect(resolvePublishedAt(null, existing, now)).toBe(existing);
    expect(resolvePublishedAt(null, null, now)).toBe(now);
  });

  it("shows only published posts whose date has come", () => {
    expect(isPubliclyVisible({ status: "published", publishedAt: now }, now)).toBe(true);
    expect(isPubliclyVisible({ status: "draft", publishedAt: now }, now)).toBe(false);
    expect(isPubliclyVisible({ status: "published", publishedAt: null }, now)).toBe(false);
    expect(
      isPubliclyVisible({ status: "published", publishedAt: new Date("2026-11-01T00:00:00Z") }, now),
    ).toBe(false);
  });

  it("builds public paths and reading time", () => {
    expect(postPath("blog", "a")).toBe("/blog/a");
    expect(postPath("article", "b")).toBe("/articles/b");
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes(Array(660).fill("w").join(" "))).toBe(3);
  });
});

describe("markdown links", () => {
  it("keeps https, mailto, site paths and anchors, and blanks everything else", () => {
    expect(safeMarkdownUrl("https://www.icao.int")).toBe("https://www.icao.int");
    expect(safeMarkdownUrl("mailto:hello@pilotqbank.com")).toBe("mailto:hello@pilotqbank.com");
    expect(safeMarkdownUrl("/atpl-ground-school")).toBe("/atpl-ground-school");
    expect(safeMarkdownUrl("#notes")).toBe("#notes");
    expect(safeMarkdownUrl("javascript:alert(1)")).toBe("");
    expect(safeMarkdownUrl("http://example.com")).toBe("");
    expect(safeMarkdownUrl("//evil.example")).toBe("");
    expect(safeMarkdownUrl("data:text/html,x")).toBe("");
    expect(isExternalUrl("https://a.example")).toBe(true);
    expect(isExternalUrl("/blog")).toBe(false);
  });
});
