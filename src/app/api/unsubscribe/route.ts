import { NextResponse } from "next/server";

import { optOutWithToken } from "@/db/unsubscribe";

/**
 * The endpoint behind a mail client's own "Unsubscribe" button (RFC 8058).
 *
 * POST opts the account out, with no page in between — that is the whole
 * point of one-click, and the token in the query string, unique to one
 * email, is the proof. GET (somebody pasting the link into a browser, or a
 * client that does not do one-click) goes to the confirmation page instead,
 * so a prefetching scanner opening the link never unsubscribes anyone.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  try {
    await optOutWithToken(token);
  } catch (error) {
    console.error("One-click unsubscribe failed:", error);
    return new NextResponse(null, { status: 500 });
  }
  // The same answer for a good token and a bad one: this says nothing about
  // which tokens exist.
  return new NextResponse(null, { status: 200 });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return NextResponse.redirect(new URL(`/unsubscribe?token=${encodeURIComponent(token)}`, request.url), 303);
}
