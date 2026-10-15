import { describe, expect, it } from "vitest";

import {
  AI_SEARCH_SYSTEM_INSTRUCTION,
  extractGeminiText,
  extractGeminiTextChunk,
  MAX_AI_SEARCH_QUERY_LENGTH,
  parseAiSearchQuery,
} from "@/lib/ai-search";

describe("parseAiSearchQuery", () => {
  it("trims a non-empty query", () => {
    expect(parseAiSearchQuery("  How does lift work?  ")).toBe("How does lift work?");
  });

  it("rejects non-strings, empty input, and queries beyond the limit", () => {
    expect(parseAiSearchQuery(undefined)).toBeNull();
    expect(parseAiSearchQuery("  ")).toBeNull();
    expect(parseAiSearchQuery("x".repeat(MAX_AI_SEARCH_QUERY_LENGTH + 1))).toBeNull();
  });

  it("accepts a query at the maximum length", () => {
    const query = "x".repeat(MAX_AI_SEARCH_QUERY_LENGTH);
    expect(parseAiSearchQuery(query)).toBe(query);
  });
});

describe("extractGeminiText", () => {
  it("joins text parts from the first candidate", () => {
    expect(
      extractGeminiText({
        candidates: [{ content: { parts: [{ text: "Use " }, { text: "the current manual." }] } }],
      }),
    ).toBe("Use the current manual.");
  });

  it("returns null for missing or empty model text", () => {
    expect(extractGeminiText({})).toBeNull();
    expect(extractGeminiText({ candidates: [] })).toBeNull();
    expect(extractGeminiText({ candidates: [{ content: { parts: [{ text: " " }] } }] })).toBeNull();
  });

  it("preserves whitespace in streamed text chunks", () => {
    expect(
      extractGeminiTextChunk({
        candidates: [{ content: { parts: [{ text: " " }] } }],
      }),
    ).toBe(" ");
  });
});

it("does not tell Gemini to imply access to manuals it cannot retrieve", () => {
  expect(AI_SEARCH_SYSTEM_INSTRUCTION).toContain("Never claim that you consulted an official manual");
  expect(AI_SEARCH_SYSTEM_INSTRUCTION).toContain("unless relevant text is included");
});
