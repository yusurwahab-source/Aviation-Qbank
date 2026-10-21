import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { claimDay, markFailed, markPosted, pickQuestionForDay } from "@/db/instagram";
import { canonicalUrl } from "@/lib/canonical-url";
import { composePost } from "@/lib/instagram/compose";
import { instagramConfig } from "@/lib/instagram/config";
import { createInstagramClient } from "@/lib/instagram/graph";
import { dayKey, kindForDate } from "@/lib/instagram/plan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// A carousel is up to five Graph calls plus processing time on Instagram's side.
export const maxDuration = 60;

function authorised(request: Request, secret: string | null): boolean {
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * The Instagram agent's daily run. Vercel Cron calls it (see `vercel.json`)
 * and sends `Authorization: Bearer $CRON_SECRET`; the owner can call it the
 * same way by hand.
 *
 * It is a dry run — it builds the post and shows it, touching nothing — unless
 * `INSTAGRAM_POSTING_ENABLED=true`, and `?preview=1` forces a dry run even
 * then. A failed publish returns 500 so the failure is visible in Vercel's
 * cron log, and the day stays retryable.
 */
export async function GET(request: Request): Promise<Response> {
  const config = instagramConfig();
  if (!authorised(request, config.cronSecret)) {
    // Not a 401: nothing here should confirm the route exists to a stranger.
    return new NextResponse("Not found", { status: 404 });
  }

  const now = new Date();
  const day = dayKey(now);
  const kind = kindForDate(now);
  const preview = new URL(request.url).searchParams.get("preview") === "1";

  const question = kind === "promo" ? null : await pickQuestionForDay(day);
  const post = composePost({
    kind,
    date: now,
    question,
    origin: canonicalUrl(),
    secret: config.cronSecret!,
  });

  if (!post) {
    return NextResponse.json({ status: "skipped", day, kind, reason: "No question fits a card." });
  }

  const live = config.postingEnabled && !preview;
  if (!live) {
    return NextResponse.json({
      status: "dry-run",
      day,
      kind,
      contentRef: post.contentRef,
      caption: post.caption,
      imageUrls: post.imageUrls,
      postingEnabled: config.postingEnabled,
    });
  }

  if (!config.accountId || !config.accessToken) {
    return NextResponse.json(
      { status: "error", reason: "INSTAGRAM_ACCOUNT_ID and INSTAGRAM_ACCESS_TOKEN are not both set." },
      { status: 500 },
    );
  }

  const claimed = await claimDay({ postedOn: day, kind, contentRef: post.contentRef });
  if (!claimed) {
    return NextResponse.json({ status: "already-posted", day });
  }

  try {
    const client = createInstagramClient({
      accountId: config.accountId,
      accessToken: config.accessToken,
    });
    const result =
      post.imageUrls.length > 1
        ? await client.publishCarousel({ imageUrls: post.imageUrls, caption: post.caption })
        : await client.publishImage({ imageUrl: post.imageUrls[0], caption: post.caption });

    await markPosted(claimed, { ...result, caption: post.caption });
    return NextResponse.json({ status: "posted", day, kind, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await markFailed(claimed, message);
    console.error("instagram agent: publish failed:", message);
    return NextResponse.json({ status: "failed", day, error: message }, { status: 500 });
  }
}
