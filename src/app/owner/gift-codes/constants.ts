/**
 * Shared between `actions.ts` (validation) and `generate-form.tsx` (the
 * input's own `max`) — kept out of `actions.ts` itself because a `"use
 * server"` file may only export async functions; a plain constant export
 * there fails the build outright, taking every other export in the same
 * file down with it.
 */
export const MAX_GENERATE_COUNT = 200;
