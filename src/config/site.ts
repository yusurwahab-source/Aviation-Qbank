/**
 * The product identity, in one place.
 *
 * "Aviation Question Bank" was a placeholder description, not a name — it
 * never appears in a component or a copy string directly. Anything that
 * needs the name, the tagline, or the site's own URL imports it from here,
 * so a rename is an edit to this file alone.
 *
 * Static data only: no environment reads, no `server-only` import, so this
 * is safe to import from both server and client components (the header, the
 * footer, the theme toggle, the manifest, the generated icons).
 */
export const siteConfig = {
  name: "Holdshort",
  tagline: "Understand the aircraft, not just the answers.",
  description:
    "Multiple-choice practice questions across three sections — Type Rating Systems Knowledge for large aircraft, Class Rating Systems Knowledge for light aircraft, and Flying Knowledge, free in full, for the ground-school material every pilot keeps reviewing. Built to teach the aircraft through every question, not to be memorised without understanding it. Study with immediate feedback or simulate the real exam, and track your progress by topic.",
  /**
   * The deployment's canonical origin, no trailing slash. Used as a fallback
   * for metadata (`metadataBase`, absolute Open Graph URLs) when no
   * request-time origin is available, e.g. at build time. `src/app/layout.tsx`
   * prefers the dynamic `appUrl()` from `lib/email/send.ts` when rendering,
   * which already knows how to read `APP_URL` and Vercel's own environment —
   * this is only the static fact of where the product lives.
   */
  url: "https://aviation-qbank.vercel.app",
} as const;
