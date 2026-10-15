export const MAX_AI_SEARCH_QUERY_LENGTH = 1000;

export const AI_SEARCH_SYSTEM_INSTRUCTION = [
  "You are a smart AI search assistant for PilotQBank.",
  "Answer aviation questions professionally and concisely.",
  "You do not have access to official FCOM, FCTM, or AFM documents unless relevant text is included in the student's message.",
  "Never claim that you consulted an official manual or invent a manual reference.",
  "For aircraft-specific or operational questions, distinguish general study information from approved procedures and direct the student to their current operator manuals and instructor.",
].join(" ");

export function parseAiSearchQuery(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const query = value.trim();
  if (query.length === 0 || query.length > MAX_AI_SEARCH_QUERY_LENGTH) return null;
  return query;
}

export function extractGeminiText(value: unknown): string | null {
  const text = extractGeminiTextChunk(value);
  return text?.trim() || null;
}

export function extractGeminiTextChunk(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("candidates" in value)) return null;
  const candidates = value.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const first = candidates[0];
  if (typeof first !== "object" || first === null || !("content" in first)) return null;
  const content = first.content;
  if (typeof content !== "object" || content === null || !("parts" in content)) return null;
  const parts = content.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts
    .flatMap((part) =>
      typeof part === "object" && part !== null && "text" in part && typeof part.text === "string"
        ? [part.text]
        : [],
    )
    .join("")
  return text || null;
}
