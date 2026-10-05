import { describe, expect, it } from "vitest";

import { extractLogbookPage, type MessagesClient } from "@/lib/logbook/claude";
import { normalizeExtractedPage, type ExtractedPage } from "@/lib/logbook/extraction";
import { sniffImageType } from "@/lib/logbook/image-type";
import { ROW_FIELDS, TOTALED_FIELDS } from "@/lib/logbook/model";
import { costMicroUsd } from "@/lib/logbook/pricing";

function blankTotals() {
  return Object.fromEntries(TOTALED_FIELDS.map((f) => [f, null])) as ExtractedPage["printed_totals"]["this_page"];
}

function extracted(rows: Partial<Record<(typeof ROW_FIELDS)[number], string | null>>[]): ExtractedPage {
  return {
    rows: rows.map((row) => ({
      ...(Object.fromEntries(ROW_FIELDS.map((f) => [f, null])) as Record<(typeof ROW_FIELDS)[number], null>),
      ...row,
      struck_through: false,
      uncertain: [],
    })),
    printed_totals: { this_page: { ...blankTotals(), total_time: "1:30" }, previous_pages: blankTotals(), total_time: blankTotals() },
    uncertain_totals: [],
    photo_note: null,
  };
}

/** A stand-in for the SDK client that replays canned replies in order. */
function fakeClient(replies: (string | Error)[]) {
  const calls: unknown[] = [];
  const client = {
    messages: {
      create: async (body: unknown) => {
        calls.push(body);
        const next = replies.shift();
        if (next instanceof Error) throw next;
        return {
          stop_reason: "end_turn",
          content: [{ type: "text", text: next }],
          usage: { input_tokens: 1500, output_tokens: 800, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        };
      },
    },
  } as unknown as MessagesClient;
  return { client, calls };
}

describe("normalizeExtractedPage", () => {
  it("turns transcribed text into minutes, and unreadable text into low-confidence blanks", () => {
    const page = normalizeExtractedPage(
      extracted([
        { date: "01/03/24", total_time: "1:30", pic: "1:30", dep_time: "0905", landings_day: "2" },
        { total_time: "abc" },
        {},
      ]),
    );
    expect(page.rows).toHaveLength(2); // the trailing blank line is dropped
    expect(page.rows[0]).toMatchObject({ total_time: 90, pic: 90, dep_time: 545, landings_day: 2 });
    expect(page.rows[1].total_time).toBeNull();
    expect(page.rows[1].confidence.total_time).toBe("low");
    expect(page.printed_totals.this_page.total_time).toBe(90);
  });
});

describe("extractLogbookPage", () => {
  const image = { model: "claude-sonnet-5-5", imageBase64: "AAAA", mediaType: "image/jpeg" as const };

  it("returns a page on a clean first reply, sending the image and the prompt", async () => {
    const { client, calls } = fakeClient([JSON.stringify(extracted([{ total_time: "1:30" }]))]);
    const result = await extractLogbookPage({ client, ...image });
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(1);
    expect(JSON.stringify(calls[0])).toContain('"type":"image"');
    expect(JSON.stringify(calls[0])).toContain("TRANSCRIBE ONLY");
  });

  it("retries once on invalid JSON, telling the model what was wrong", async () => {
    const { client, calls } = fakeClient(["not json", JSON.stringify(extracted([{ total_time: "1:30" }]))]);
    const result = await extractLogbookPage({ client, ...image });
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(2);
    expect(JSON.stringify(calls[1])).toContain("not valid JSON");
    expect(result.usage.inputTokens).toBe(3000);
  });

  it("gives up after a second invalid reply", async () => {
    const { client } = fakeClient(["{}", "{}"]);
    const result = await extractLogbookPage({ client, ...image });
    expect(result).toMatchObject({ ok: false, reason: "invalid", attempts: 2 });
  });

  it("retries a reply with badly formatted times, then uses the best it has", async () => {
    const bad = JSON.stringify(extracted([{ total_time: "1h30m" }]));
    const { client, calls } = fakeClient([bad, bad]);
    const result = await extractLogbookPage({ client, ...image });
    expect(JSON.stringify(calls[1])).toContain("is not H:MM");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.page.rows[0].confidence.total_time).toBe("low");
  });
});

describe("sniffImageType", () => {
  it("reads the file's own bytes", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    const heic = new TextEncoder().encode("\0\0\0\x18ftypheic\0\0\0\0");
    expect(sniffImageType(heic)).toBe("heic");
    expect(sniffImageType(new TextEncoder().encode("<html>"))).toBeNull();
  });
});

describe("costMicroUsd", () => {
  it("prices a request at the model's per-token rate", () => {
    // 10k in at $2/M + 2k out at $10/M = $0.02 + $0.02
    expect(costMicroUsd("claude-sonnet-5-5", { inputTokens: 10_000, outputTokens: 2_000 })).toBe(40_000);
    expect(costMicroUsd("unknown-model", { inputTokens: 1, outputTokens: 1 })).toBeNull();
  });
});
