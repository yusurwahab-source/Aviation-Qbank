import { checkAiSearchAllowed, recordAiSearchRequest } from "@/db/login-attempts";
import { getClientIp } from "@/lib/auth/client-ip";
import { describeWait } from "@/lib/auth/rate-limit-policy";
import { envValue } from "@/lib/env";
import {
  AI_SEARCH_SYSTEM_INSTRUCTION,
  extractGeminiText,
  parseAiSearchQuery,
} from "@/lib/ai-search";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GEMINI_MODEL = "gemini-2.5-flash";

function fail(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
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
  const model = envValue("GEMINI_MODEL") ?? GEMINI_MODEL;

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
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    );
    endpoint.searchParams.set("key", apiKey);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: AI_SEARCH_SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: query }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      console.error("Gemini AI search request failed with status", response.status);
      return fail(
        500,
        `Gemini API request failed with HTTP ${response.status}. Check the server API key and model configuration.`,
      );
    }

    const answer = extractGeminiText(await response.json());
    if (!answer) {
      console.error("Gemini AI search returned no text");
      return fail(500, "Gemini returned no text. Please try again.");
    }
    return NextResponse.json({ ok: true, answer });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return fail(504, "The AI assistant took too long to respond. Please try again.");
    }
    console.error(
      "Gemini AI search request failed",
      error instanceof Error ? error.name : "Unknown error",
    );
    return fail(500, "The Gemini API could not be reached. Please check the server configuration and try again.");
  }
}
