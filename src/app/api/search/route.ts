import { checkAiSearchAllowed, recordAiSearchRequest } from "@/db/login-attempts";
import { getClientIp } from "@/lib/auth/client-ip";
import { describeWait } from "@/lib/auth/rate-limit-policy";
import { envValue } from "@/lib/env";
import {
  AI_SEARCH_SYSTEM_INSTRUCTION,
  extractGeminiText,
  parseAiSearchQuery,
} from "@/lib/ai-search";

export const dynamic = "force-dynamic";

function fail(status: number, error: string): Response {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(request: Request): Promise<Response> {
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
  if (!apiKey) return fail(503, "The AI search tool is not configured on this server yet.");

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

  const endpoint = new URL(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
  );
  endpoint.searchParams.set("key", apiKey);

  try {
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
      console.error("Gemini AI search request failed", response.status);
      return fail(502, "The AI assistant could not answer right now. Please try again.");
    }

    const answer = extractGeminiText(await response.json());
    if (!answer) return fail(502, "The AI assistant returned no answer. Please try again.");
    return Response.json({ ok: true, answer });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return fail(504, "The AI assistant took too long to respond. Please try again.");
    }
    console.error("Gemini AI search request failed");
    return fail(502, "The AI assistant could not answer right now. Please try again.");
  }
}
