import { describe, expect, it, vi } from "vitest";

import { composePost } from "@/lib/instagram/compose";
import { createInstagramClient, InstagramError } from "@/lib/instagram/graph";
import {
  CARD_LIMITS,
  clampCaption,
  dayKey,
  fitsCard,
  hashtags,
  kindForDate,
  MAX_CAPTION,
  promoForDate,
  PROMOS,
  questionCaption,
  type CardQuestion,
} from "@/lib/instagram/plan";
import { signCard, verifyCard } from "@/lib/instagram/signature";

const question: CardQuestion & { subjectCode: string } = {
  id: "POF-AFOIL-0055",
  subjectCode: "POF",
  subjectName: "Principles of Flight",
  topic: "Aerofoils and Lift Theory",
  question: "Compared with a high-aspect-ratio wing, a low-aspect-ratio wing has:",
  options: [
    { id: "a", text: "A steeper slope and a higher CLmax" },
    { id: "b", text: "A steeper lift-curve slope and a lower stalling angle" },
    { id: "c", text: "A shallower lift-curve slope and a higher stalling angle" },
  ],
  correct: "c",
  explanation: "Lower A means larger induced angle per unit CL, so the slope is smaller.",
};

describe("the posting rhythm", () => {
  it("gives every day of the week a kind, and the week has all three", () => {
    const kinds = new Set<string>();
    for (let d = 0; d < 7; d += 1) kinds.add(kindForDate(new Date(Date.UTC(2026, 9, 18 + d))));
    expect(kinds).toEqual(new Set(["question", "tip", "promo"]));
  });

  it("reads the UTC day, whatever the server's own time zone", () => {
    expect(dayKey(new Date("2026-10-21T23:59:00Z"))).toBe("2026-10-21");
    expect(kindForDate(new Date("2026-10-21T23:59:00Z"))).toBe(kindForDate(new Date("2026-10-21T00:01:00Z")));
  });

  it("picks the same promo all day and a different one the next", () => {
    const a = promoForDate(new Date("2026-10-21T01:00:00Z"));
    expect(promoForDate(new Date("2026-10-21T22:00:00Z"))).toBe(a);
    expect(promoForDate(new Date("2026-10-22T01:00:00Z"))).not.toBe(a);
  });

  it("says nothing in a promo that a count could make untrue", () => {
    for (const promo of PROMOS) expect(`${promo.headline} ${promo.body}`).not.toMatch(/\d/);
  });
});

describe("fitsCard", () => {
  it("accepts an ordinary question", () => {
    expect(fitsCard(question)).toBe(true);
  });

  it("refuses rather than shortens", () => {
    expect(fitsCard({ ...question, question: "x".repeat(CARD_LIMITS.question + 1) })).toBe(false);
    expect(
      fitsCard({ ...question, options: [...question.options.slice(0, 2), { id: "c", text: "y".repeat(101) }] }),
    ).toBe(false);
    expect(fitsCard({ ...question, explanation: "z".repeat(CARD_LIMITS.explanation + 1) })).toBe(false);
  });

  it("refuses a question with a single option or five", () => {
    expect(fitsCard({ ...question, options: question.options.slice(0, 1) })).toBe(false);
    expect(
      fitsCard({ ...question, options: ["a", "b", "c", "d", "e"].map((id) => ({ id, text: id })) }),
    ).toBe(false);
  });
});

describe("captions", () => {
  it("never leaks the answer in the question caption", () => {
    const caption = questionCaption(question, "POF", "pilotqbank.com");
    expect(caption).toContain("A) A steeper slope");
    expect(caption).not.toContain(question.explanation);
  });

  it("stays inside Instagram's limits", () => {
    expect(clampCaption("a".repeat(5000)).length).toBeLessThanOrEqual(MAX_CAPTION);
    expect(hashtags("POF").split(" ").length).toBeLessThanOrEqual(30);
  });
});

describe("card signatures", () => {
  it("verifies what was signed and nothing else", () => {
    const sig = signCard("secret", "answer", "POF-AFOIL-0055");
    expect(verifyCard("secret", "answer", "POF-AFOIL-0055", sig)).toBe(true);
    expect(verifyCard("secret", "question", "POF-AFOIL-0055", sig)).toBe(false);
    expect(verifyCard("secret", "answer", "POF-AFOIL-0056", sig)).toBe(false);
    expect(verifyCard("other", "answer", "POF-AFOIL-0055", sig)).toBe(false);
    expect(verifyCard("secret", "answer", "POF-AFOIL-0055", "")).toBe(false);
  });
});

describe("composePost", () => {
  const base = { date: new Date("2026-10-19T10:00:00Z"), origin: "https://pilotqbank.com", secret: "s" };

  it("makes a question a two-slide carousel: the question, then its solution", () => {
    const post = composePost({ ...base, kind: "question", question })!;
    expect(post.imageUrls).toHaveLength(2);
    expect(post.imageUrls[0]).toContain("kind=question");
    expect(post.imageUrls[1]).toContain("kind=answer");
    expect(post.contentRef).toBe(question.id);
  });

  it("signs every url it hands out", () => {
    for (const kind of ["question", "tip", "promo"] as const) {
      const post = composePost({ ...base, kind, question })!;
      for (const url of post.imageUrls) {
        const p = new URL(url).searchParams;
        expect(verifyCard("s", p.get("kind") as "question", p.get("id")!, p.get("sig")!)).toBe(true);
      }
    }
  });

  it("returns nothing when a question post has no question", () => {
    expect(composePost({ ...base, kind: "tip", question: null })).toBeNull();
  });
});

describe("the Instagram client", () => {
  function stand(responses: Array<{ ok?: boolean; status?: number; body: unknown }>) {
    const calls: Array<{ url: string; body: string }> = [];
    const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), body: String(init?.body ?? "") });
      const next = responses.shift()!;
      return { ok: next.ok ?? true, status: next.status ?? 200, json: async () => next.body } as Response;
    });
    return { fn: fn as unknown as typeof fetch, calls };
  }
  const options = { accountId: "123", accessToken: "tok", pollIntervalMs: 0 };

  it("creates a container, waits for it, publishes, and reads the permalink", async () => {
    const { fn, calls } = stand([
      { body: { id: "c1" } },
      { body: { status_code: "IN_PROGRESS" } },
      { body: { status_code: "FINISHED" } },
      { body: { id: "m1" } },
      { body: { permalink: "https://instagram.com/p/x" } },
    ]);
    const result = await createInstagramClient({ ...options, fetch: fn }).publishImage({
      imageUrl: "https://img",
      caption: "hi",
    });
    expect(result).toEqual({ mediaId: "m1", permalink: "https://instagram.com/p/x" });
    expect(calls[0].url).toContain("/123/media");
    expect(calls[0].body).toContain("image_url=https%3A%2F%2Fimg");
    expect(calls[3].url).toContain("/123/media_publish");
  });

  it("builds a carousel from its children", async () => {
    const { fn, calls } = stand([
      { body: { id: "a" } },
      { body: { id: "b" } },
      { body: { status_code: "FINISHED" } },
      { body: { status_code: "FINISHED" } },
      { body: { id: "parent" } },
      { body: { status_code: "FINISHED" } },
      { body: { id: "m2" } },
      { body: {} },
    ]);
    const result = await createInstagramClient({ ...options, fetch: fn }).publishCarousel({
      imageUrls: ["https://1", "https://2"],
      caption: "c",
    });
    expect(result.mediaId).toBe("m2");
    expect(calls[4].body).toContain("media_type=CAROUSEL");
    expect(calls[4].body).toContain("children=a%2Cb");
  });

  it("surfaces Meta's message and never the token", async () => {
    const { fn } = stand([{ ok: false, status: 400, body: { error: { message: "Invalid image" } } }]);
    const error = await createInstagramClient({ ...options, fetch: fn })
      .publishImage({ imageUrl: "x", caption: "c" })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(InstagramError);
    expect((error as Error).message).toContain("Invalid image");
    expect((error as Error).message).not.toContain("tok");
  });

  it("gives up on a container that errors, or never finishes", async () => {
    const errored = stand([{ body: { id: "c" } }, { body: { status_code: "ERROR" } }]);
    await expect(
      createInstagramClient({ ...options, fetch: errored.fn }).publishImage({ imageUrl: "x", caption: "c" }),
    ).rejects.toThrow(/could not process/);

    const slow = stand([{ body: { id: "c" } }, ...Array.from({ length: 3 }, () => ({ body: { status_code: "IN_PROGRESS" } }))]);
    await expect(
      createInstagramClient({ ...options, maxPolls: 3, fetch: slow.fn }).publishImage({ imageUrl: "x", caption: "c" }),
    ).rejects.toThrow(/too long/);
  });

  it("refuses a carousel of one", async () => {
    await expect(
      createInstagramClient({ ...options, fetch: stand([]).fn }).publishCarousel({ imageUrls: ["x"], caption: "c" }),
    ).rejects.toThrow(/between 2 and 10/);
  });
});
