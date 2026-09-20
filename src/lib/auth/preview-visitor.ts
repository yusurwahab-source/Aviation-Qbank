import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";

import { PREVIEW_COOKIE, PREVIEW_COOKIE_MAX_AGE_SECONDS } from "@/lib/auth/cookie-names";

/**
 * Who a signed-out visitor is, for the length of their preview.
 *
 * Not an account and not a login. This is the least identity the preview
 * allowance can be counted against: a random token in an HTTP-only cookie,
 * stored as its SHA-256 in `preview_attempts` — the same shape as
 * `session.ts`, and for the same reason. Reading the table tells you that
 * somebody previewed some questions; it does not hand you anything you
 * could present as them.
 *
 * Nothing about a person is recorded here. There is no email, no address,
 * no fingerprint — the token is random, and the only thing ever written
 * beside it is which questions were shown. It exists to count to five, and
 * that is all it can do.
 *
 * **What this is not.** A cookie is the visitor's to delete, and a script
 * that never sends one back is a new visitor on every request. So this
 * meters honest use and nothing more; the limit that actually bounds a
 * scripted scrape is `RATE_LIMIT_RULES.previewPerIp`, checked in the same
 * breath. Saying otherwise would be the kind of comfortable claim this
 * codebase avoids elsewhere.
 */

/** SHA-256 over 256 bits of randomness: nothing to brute force, so no slow
 * hash — the identical reasoning `session.ts` gives for its own tokens. */
function tokenToId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * The current visitor's id, or null if they have never been given one.
 *
 * Read-only, so this is safe in a server component — which matters, because
 * the test page needs it to size a signed-out test and a server component
 * cannot set a cookie. Null there simply means "new visitor", which is the
 * right answer: they have spent none of their preview.
 *
 * Cached per request, like `getCurrentUser`, so several readers share one
 * cookie read.
 */
export const getPreviewVisitorId = cache(async (): Promise<string | null> => {
  const token = (await cookies()).get(PREVIEW_COOKIE)?.value;
  return token ? tokenToId(token) : null;
});

/**
 * The current visitor's id, minting one if they have none.
 *
 * Only callable from a server action or a route handler — setting a cookie
 * anywhere else throws in Next.js. `answerQuestion` is the one caller, and
 * that is deliberate: a visitor is created by spending the first question of
 * their preview, not by loading a page, so nobody who merely reads the site
 * is given a cookie at all.
 */
export async function ensurePreviewVisitorId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(PREVIEW_COOKIE)?.value;
  if (existing) return tokenToId(existing);

  const token = randomBytes(32).toString("base64url");
  cookieStore.set(PREVIEW_COOKIE, token, {
    httpOnly: true, // never readable by script on the page
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PREVIEW_COOKIE_MAX_AGE_SECONDS,
  });

  return tokenToId(token);
}
