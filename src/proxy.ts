import { NextResponse, type NextRequest } from "next/server";

import {
  PREVIEW_COOKIE,
  PREVIEW_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE,
} from "@/lib/auth/cookie-names";

/**
 * Gives a signed-out visitor their preview identity before they need it.
 *
 * This exists for one concrete reason, found in a browser rather than
 * reasoned about. `ensurePreviewVisitorId` mints the cookie inside
 * `answerQuestion`, and **a server action that writes a cookie makes Next
 * re-render the page it was called from.** A signed-out test page has no
 * session to resume, so re-rendering it draws a fresh random set of
 * questions — meaning the very first answer of a visitor's very first test
 * silently restarted that test and threw away the answer they had just
 * given. Minting the cookie here, on the way *in*, means the action never
 * writes one and nothing re-renders.
 *
 * `proxy.ts`, not `middleware.ts`: the middleware file convention is
 * deprecated in Next 16 and renamed to this, and the build says so.
 *
 * It only ever mints, never reads anything else and never decides anything.
 * The allowance is still counted server-side against `preview_attempts` —
 * see `db/preview.ts` — and `ensurePreviewVisitorId` is still the fallback,
 * so nothing here is load-bearing for correctness. If this file were
 * deleted the preview would still be enforced; the first test of a visit
 * would just restart once.
 *
 * Nothing is minted for a request that already carries a session cookie: a
 * signed-in student is metered against their account, and a visitor who
 * does not practise never gets a cookie at all, because the matcher below
 * is only the aircraft and class-rating routes.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(PREVIEW_COOKIE)) return NextResponse.next();
  // Present but expired or bogus is still "signed in" as far as this is
  // concerned — the fallback in the action covers that case, and guessing
  // here would mean a database lookup on every request.
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const token = randomToken();

  // Set on the request as well as the response, so the page rendering *this*
  // request already sees it. Without that, the first page load would still
  // count as an unknown visitor and the action would mint a second one.
  request.cookies.set(PREVIEW_COOKIE, token);
  const response = NextResponse.next({ request: { headers: request.headers } });

  response.cookies.set(PREVIEW_COOKIE, token, {
    httpOnly: true, // never readable by script on the page
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PREVIEW_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}

/**
 * 256 bits, base64url. Web Crypto rather than `node:crypto`: a proxy
 * defaults to the Node runtime in Next 16 but is explicitly allowed to run
 * outside the application's own, so this keeps to what both have. The same
 * number of bits either way, and the token is hashed to a visitor id in
 * Node before it is ever stored.
 */
function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export const config = {
  // Only where a test can actually be started or answered. Every other
  // route — the landing page, the owner console, the API — is untouched,
  // so nobody gets a cookie for reading the marketing copy.
  matcher: ["/aircraft/:path*", "/class/:path*"],
};
