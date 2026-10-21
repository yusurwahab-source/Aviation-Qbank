import { ImageResponse } from "next/og";

import { getCardQuestion } from "@/db/instagram";
import { CARD_SIZE, renderCard, type CardSpec } from "@/lib/instagram/card";
import { instagramConfig } from "@/lib/instagram/config";
import { cardFonts } from "@/lib/instagram/fonts";
import { PROMOS } from "@/lib/instagram/plan";
import { isCardKind, verifyCard } from "@/lib/instagram/signature";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const notFound = () => new Response("Not found", { status: 404 });

/**
 * One card image, for Instagram to fetch.
 *
 * Public by necessity and signed by design: see `lib/instagram/signature.ts`.
 * Anything unsigned, mis-signed, unknown or unpublished is the same 404, so
 * the route says nothing about what exists.
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const id = params.get("id") ?? "";
  const signature = params.get("sig") ?? "";
  const { cronSecret } = instagramConfig();

  if (!cronSecret || !isCardKind(kind) || !verifyCard(cronSecret, kind, id, signature)) {
    return notFound();
  }

  let spec: CardSpec;
  if (kind === "promo") {
    const promo = PROMOS.find((entry) => entry.key === id);
    if (!promo) return notFound();
    spec = { kind, promo };
  } else {
    const question = await getCardQuestion(id);
    if (!question) return notFound();
    spec = { kind, question };
  }

  const fonts = await cardFonts();
  return new ImageResponse(renderCard(spec), {
    ...CARD_SIZE,
    fonts: fonts.length > 0 ? fonts : undefined,
  });
}
