import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import {
  EXTRACTION_PROMPT,
  extractedPageSchema,
  formatProblems,
  normalizeExtractedPage,
  type ExtractedPage,
} from "./extraction";
import type { LogbookPage } from "./model";

/**
 * One photo in, one transcribed page out.
 *
 * Takes its client as an argument so the retry logic can be tested with a
 * stand-in; the route builds the real one. The image is passed through as
 * bytes and never written anywhere — the request body is the only place it
 * exists outside the student's phone.
 *
 * Two attempts at most. The reply is held to a JSON schema by the API
 * itself (structured outputs) and then parsed and checked here again with
 * the same Zod schema plus the format rules the prompt asks for; anything
 * that fails is sent back once with the problems named. A reply that still
 * has format problems after that is used anyway — every value that will not
 * parse becomes a low-confidence blank the student fills in from the photo.
 */

export type ExtractionUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export type ExtractionResult =
  | { ok: true; page: LogbookPage; note: string | null; usage: ExtractionUsage; attempts: number }
  | { ok: false; reason: "refused" | "invalid" | "provider"; detail: string; usage: ExtractionUsage; attempts: number };

export type MessagesClient = Pick<Anthropic, "messages">;

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

const MAX_ATTEMPTS = 2;

function addUsage(total: ExtractionUsage, usage: Anthropic.Usage | undefined) {
  if (!usage) return;
  total.inputTokens += usage.input_tokens ?? 0;
  total.outputTokens += usage.output_tokens ?? 0;
  total.cacheReadTokens += usage.cache_read_input_tokens ?? 0;
  total.cacheWriteTokens += usage.cache_creation_input_tokens ?? 0;
}

function parseReply(text: string): { page: ExtractedPage } | { error: string } {
  let json: unknown;
  try {
    // Tolerate a fenced block on the fallback path, where the API is not
    // holding the reply to a schema.
    json = JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ""));
  } catch {
    return { error: "The reply was not valid JSON." };
  }
  const parsed = extractedPageSchema.safeParse(json);
  if (!parsed.success) {
    return {
      error: parsed.error.issues
        .slice(0, 10)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    };
  }
  return { page: parsed.data };
}

export async function extractLogbookPage(input: {
  client: MessagesClient;
  model: string;
  imageBase64: string;
  mediaType: ImageMediaType;
  effort?: "low" | "medium" | "high";
}): Promise<ExtractionResult> {
  const usage: ExtractionUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
  const format = zodOutputFormat(extractedPageSchema);
  let structured = true;
  let feedback: string | null = null;
  let lastProblem = "";
  let fallback: ExtractedPage | null = null;
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;

    const content: Anthropic.ContentBlockParam[] = [
      { type: "image", source: { type: "base64", media_type: input.mediaType, data: input.imageBase64 } },
      {
        type: "text",
        text: structured
          ? "Transcribe this logbook spread."
          : `Transcribe this logbook spread. Reply with only a JSON object matching this JSON schema, no other text:\n${JSON.stringify(format.schema)}`,
      },
    ];
    const messages: Anthropic.MessageParam[] = [{ role: "user", content }];
    if (feedback) {
      // A fresh request rather than a reply in the same conversation: the
      // first attempt's output is not replayed, only what was wrong with it.
      content.push({
        type: "text",
        text: `A previous transcription of this photo had these problems — avoid them, and still transcribe only what is written:\n${feedback}`,
      });
    }

    let response: Anthropic.Message;
    try {
      response = await input.client.messages.create({
        model: input.model,
        max_tokens: 16000,
        system: [{ type: "text", text: EXTRACTION_PROMPT, cache_control: { type: "ephemeral" } }],
        messages,
        output_config: {
          effort: input.effort ?? "medium",
          ...(structured ? { format: { type: "json_schema", schema: format.schema } } : {}),
        },
      });
    } catch (error) {
      // A schema the API will not compile is the one 400 worth working
      // around: fall back to asking for JSON in words, and validate it here.
      if (structured && error instanceof Anthropic.BadRequestError) {
        structured = false;
        attempts -= 1;
        continue;
      }
      const detail =
        error instanceof Anthropic.APIError ? `${error.status ?? "?"} ${error.message}` : String(error);
      return { ok: false, reason: "provider", detail, usage, attempts };
    }

    addUsage(usage, response.usage);

    if (response.stop_reason === "refusal") {
      return { ok: false, reason: "refused", detail: "The model declined to read this photo.", usage, attempts };
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const parsed = parseReply(text);
    if ("error" in parsed) {
      lastProblem =
        response.stop_reason === "max_tokens" ? "The reply was cut off before it finished." : parsed.error;
      feedback = lastProblem;
      continue;
    }

    const problems = formatProblems(parsed.page);
    if (problems.length === 0) {
      return { ok: true, page: normalizeExtractedPage(parsed.page), note: parsed.page.photo_note, usage, attempts };
    }
    fallback = parsed.page;
    lastProblem = problems.slice(0, 20).join("\n");
    feedback = lastProblem;
  }

  if (fallback) {
    return { ok: true, page: normalizeExtractedPage(fallback), note: fallback.photo_note, usage, attempts };
  }
  return { ok: false, reason: "invalid", detail: lastProblem, usage, attempts };
}
