import { describe, expect, it, vi } from "vitest";

import { fetchGeminiWithRetries } from "@/lib/ai-search-retry";

describe("fetchGeminiWithRetries", () => {
  it("retries 503 responses with exponential delays", async () => {
    const makeRequest = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("still busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok"));
    const wait = vi.fn().mockResolvedValue(undefined);

    const response = await fetchGeminiWithRetries(makeRequest, { wait });

    expect(response.status).toBe(200);
    expect(makeRequest).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls.map(([milliseconds]) => milliseconds)).toEqual([1_500, 3_000]);
  });

  it("returns the final 503 after three attempts", async () => {
    const makeRequest = vi.fn().mockResolvedValue(new Response("busy", { status: 503 }));
    const wait = vi.fn().mockResolvedValue(undefined);

    const response = await fetchGeminiWithRetries(makeRequest, { wait });

    expect(response.status).toBe(503);
    expect(makeRequest).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls.map(([milliseconds]) => milliseconds)).toEqual([1_500, 3_000]);
  });

  it("does not retry non-503 HTTP errors", async () => {
    const makeRequest = vi.fn().mockResolvedValue(new Response("invalid key", { status: 401 }));
    const wait = vi.fn().mockResolvedValue(undefined);

    const response = await fetchGeminiWithRetries(makeRequest, { wait });

    expect(response.status).toBe(401);
    expect(makeRequest).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it("retries transient network failures", async () => {
    const makeRequest = vi.fn()
      .mockRejectedValueOnce(new TypeError("network error"))
      .mockResolvedValueOnce(new Response("ok"));
    const wait = vi.fn().mockResolvedValue(undefined);

    const response = await fetchGeminiWithRetries(makeRequest, { wait });

    expect(response.status).toBe(200);
    expect(makeRequest).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(1_500);
  });
});
