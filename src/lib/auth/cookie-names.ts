/**
 * The cookie names, and nothing else.
 *
 * Its own module with no imports at all — not `server-only`, not
 * `next/headers` — because `middleware.ts` needs these and middleware
 * cannot import either. Everything that actually *reads* a cookie still
 * lives in `session.ts` and `preview-visitor.ts`; this is only the two
 * strings they and the middleware have to agree on.
 */

export const SESSION_COOKIE = "qbank_session";

export const PREVIEW_COOKIE = "qbank_preview";

/**
 * How long a signed-out visitor stays the same visitor. Long enough that
 * coming back next week still finds the preview they already spent, short
 * enough to expire on its own. The row it points at outlives it harmlessly
 * — see `sweepPreviewAttempts`.
 */
export const PREVIEW_COOKIE_MAX_AGE_SECONDS = 180 * 24 * 60 * 60; // 180 days
