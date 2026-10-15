import { checkAiSearchAllowed, recordAiSearchRequest } from "@/db/login-attempts";
import { getClientIp } from "@/lib/auth/client-ip";
import { describeWait } from "@/lib/auth/rate-limit-policy";
import { envValue } from "@/lib/env";
import {
  AI_SEARCH_SYSTEM_INSTRUCTION,
  extractGeminiTextChunk,
  parseAiSearchQuery,
} from "@/lib/ai-search";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GEMINI_MODEL = "gemini-2.5-flash";

function fail(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

function redactApiKey(message: string, apiKey: string): string {
  return message.replaceAll(apiKey, "[redacted]").slice(0, 500);
}

function upstreamErrorMessage(payload: unknown): string | null {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("error" in payload) ||
    typeof payload.error !== "object" ||
    payload.error === null ||
    !("message" in payload.error) ||
    typeof payload.error.message !== "string"
  ) {
    return null;
  }

  const message = payload.error.message.trim();
  return message || null;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Send a valid JSON request.");
  }

  const query = parseAiSearchQuery(
    typeof body === "object" && body !== null && "query" in body ? body.query : undefined,
  );
  if (!query) return fail(400, "Enter a question of 1,000 characters or fewer.");

  const apiKey = envValue("GEMINI_API_KEY");
  if (!apiKey) return fail(500, "GEMINI_API_KEY is missing from the server environment.");

  let ip: string;
  try {
    ip = await getClientIp();
    const allowed = await checkAiSearchAllowed(ip);
    if (!allowed.allowed) {
      return fail(429, `Too many searches. Try again ${describeWait(allowed.retryAfterMs)}.`);
    }
    await recordAiSearchRequest(ip);
  } catch {
    return fail(503, "AI search is temporarily unavailable. Please try again later.");
  }

  try {
    const endpoint = new URL(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`,
    );
    endpoint.searchParams.set("key", apiKey);
    endpoint.searchParams.set("alt", "sse");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: AI_SEARCH_SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: query }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.3 },
      }),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(25_000)]),
    });

    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      const detail = upstreamErrorMessage(payload);
      const message = detail
        ? `Gemini API request failed with HTTP ${response.status}: ${detail}`
        : `Gemini API request failed with HTTP ${response.status}.`;
      console.error("Gemini AI search request failed with status", response.status);
      return fail(502, redactApiKey(message, apiKey));
    }

    if (!response.body) {
      console.error("Gemini AI search returned an empty stream");
      return fail(502, "Gemini did not return a response. Please try again.");
    }

    const upstreamReader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";
    let cancelled = false;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (data: unknown, event?: string) => {
          if (cancelled) return;
          if (event) controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        const parseEvent = (event: string) => {
          const data = event
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
          if (!data || data === "[DONE]") return;

          try {
            const payload: unknown = JSON.parse(data);
            const text = extractGeminiTextChunk(payload);
            if (text) send({ text });
          } catch {
            throw new Error("Gemini returned an invalid streaming response.");
          }
        };

        void (async () => {
          try {
            while (true) {
              const { done, value } = await upstreamReader.read();
              buffer += decoder.decode(value, { stream: !done });

              let boundary = buffer.search(/\r?\n\r?\n/);
              while (boundary !== -1) {
                const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0] ?? "\n\n";
                parseEvent(buffer.slice(0, boundary));
                buffer = buffer.slice(boundary + separator.length);
                boundary = buffer.search(/\r?\n\r?\n/);
              }

              if (done) {
                if (buffer.trim()) parseEvent(buffer);
                send({ done: true });
                if (!cancelled) controller.close();
                return;
              }
            }
          } catch (error) {
            if (cancelled) return;
            const message =
              error instanceof Error ? redactApiKey(error.message, apiKey) : "Unknown error";
            console.error("Gemini AI search stream failed", message);
            send({ error: "The AI response was interrupted. Please try again." }, "error");
            controller.close();
          } finally {
            upstreamReader.releaseLock();
          }
        })();
      },
      cancel() {
        cancelled = true;
        void upstreamReader.cancel();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return fail(504, "The AI assistant took too long to respond. Please try again.");
    }
    const message =
      error instanceof Error ? redactApiKey(error.message, apiKey) : "Unknown error";
    console.error("Gemini AI search request failed", message);
    return fail(502, `The Gemini API request could not be completed: ${message}`);
  }
}
