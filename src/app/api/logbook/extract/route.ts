import Anthropic from "@anthropic-ai/sdk";

import { finishExtraction, getSpreadsRemaining, reserveExtraction } from "@/db/logbooks";
import { checkLogbookUploadAllowed, recordLogbookUpload } from "@/db/login-attempts";
import { describeWait } from "@/lib/auth/rate-limit-policy";
import { getCurrentUser } from "@/lib/auth/session";
import { envValue } from "@/lib/env";
import { extractLogbookPage } from "@/lib/logbook/claude";
import { MAX_IMAGE_BYTES } from "@/lib/logbook/entitlement";
import { sniffImageType } from "@/lib/logbook/image-type";
import { DEFAULT_LOGBOOK_MODEL, costMicroUsd } from "@/lib/logbook/pricing";

/**
 * One logbook photo in, one transcribed page out.
 *
 * The order matters and mirrors log in's: who is asking, then the rate
 * limit, then the size, then the allowance — each refusal cheaper than the
 * check after it, and none of them after the paid model call. The image
 * lives only in this request's memory: it is read into a buffer, sent to
 * the model, and dropped. Nothing about it is written anywhere; the row in
 * `logbook_extractions` holds token counts, not content.
 *
 * The API key is read here, on the server, and never leaves it.
 */

export const dynamic = "force-dynamic";
// A dense page can take the model a minute or more; give it room.
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status: number, code: string, error: string): Response {
  return Response.json({ ok: false, code, error }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return fail(401, "signed_out", "Sign in to scan your logbook.");

  const apiKey = envValue("ANTHROPIC_API_KEY");
  if (!apiKey) return fail(503, "not_configured", "The Logbook Scanner is not configured on this server yet.");

  const allowed = await checkLogbookUploadAllowed(user.id);
  if (!allowed.allowed) {
    return fail(429, "rate_limited", `Too many uploads. Try again ${describeWait(allowed.retryAfterMs)}.`);
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_IMAGE_BYTES + 64 * 1024) {
    return fail(413, "too_large", "That photo is larger than 10 MB.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "bad_request", "The upload could not be read.");
  }

  const logbookId = form.get("logbookId");
  const image = form.get("image");
  if (typeof logbookId !== "string" || !UUID.test(logbookId) || !(image instanceof Blob)) {
    return fail(400, "bad_request", "The upload could not be read.");
  }
  if (image.size > MAX_IMAGE_BYTES) return fail(413, "too_large", "That photo is larger than 10 MB.");
  if (image.size === 0) return fail(400, "bad_request", "That photo is empty.");

  const bytes = new Uint8Array(await image.arrayBuffer());
  const mediaType = sniffImageType(bytes);
  if (mediaType === "heic") {
    return fail(
      415,
      "heic",
      "This browser sent the photo as HEIC, which can't be read. On iPhone, choose Settings › Camera › Formats › Most Compatible, or upload a JPEG.",
    );
  }
  if (!mediaType) return fail(415, "unsupported", "Upload a JPEG, PNG or WebP photo.");

  // Counted before the allowance is checked, so a flood of uploads past the
  // allowance still runs into the rate limit.
  await recordLogbookUpload(user.id);

  const model = envValue("LOGBOOK_MODEL") ?? DEFAULT_LOGBOOK_MODEL;
  const reservation = await reserveExtraction({ userId: user.id, logbookId, model });
  if (!reservation.ok) {
    if (reservation.reason === "not_found") return fail(404, "not_found", "That logbook was not found.");
    return fail(
      402,
      reservation.reason,
      reservation.reason === "free_exhausted"
        ? "Your free spreads are used up. Unlock this logbook to scan the rest."
        : "This logbook has reached its 40-spread limit. Start a new logbook to continue.",
    );
  }

  const started = Date.now();
  const effort = envValue("LOGBOOK_EFFORT");
  const result = await extractLogbookPage({
    client: new Anthropic({ apiKey, maxRetries: 2 }),
    model,
    imageBase64: Buffer.from(bytes).toString("base64"),
    mediaType,
    effort: effort === "low" || effort === "high" ? effort : "medium",
  });

  await finishExtraction(reservation.extractionId, {
    status: result.ok ? "ok" : "failed",
    ...result.usage,
    costMicroUsd: costMicroUsd(model, result.usage),
    attempts: result.attempts,
    durationMs: Date.now() - started,
    error: result.ok ? null : `${result.reason}: ${result.detail}`,
  });

  if (!result.ok) {
    // The detail is for the owner's log; the student gets a sentence they
    // can act on, and the spread is not counted.
    console.error("Logbook extraction failed", result.reason, result.detail);
    return fail(
      502,
      "extraction_failed",
      result.reason === "refused"
        ? "This photo could not be read. Make sure it shows a logbook spread and try again."
        : "The page could not be read this time. Try again, or retake the photo in better light.",
    );
  }

  return Response.json({
    ok: true,
    page: result.page,
    note: result.note,
    chargedTo: reservation.chargedTo,
    spreadsRemaining: await getSpreadsRemaining(user.id, logbookId),
  });
}
