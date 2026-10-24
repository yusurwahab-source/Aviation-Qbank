/**
 * Which codes have a study guide at `public/<code>-study-guide.html`.
 *
 * This is a hand-kept list, not a filesystem check, and that is a deliberate
 * correction: the first version of this function called `existsSync`
 * against `public/` from here, which is correct in local dev and in a local
 * `next build && next start`, but silently false on Vercel — the Node.js
 * serverless function that renders this page does not have `public/` on
 * its filesystem at all; those files are served by Vercel's static asset
 * layer directly, never bundled into the Lambda. The guide loaded perfectly
 * at its own URL while the link that was supposed to point at it never
 * appeared, and only fetching the deployed page directly showed that,
 * not reasoning about the code. Add a code here the same moment its guide
 * file is added to `public/` — the file itself is still the only thing a
 * new aircraft's guide needs, this line is what makes the app know it is
 * there.
 */
const STUDY_GUIDE_CODES = new Set(["DA40", "C152", "DA42", "A320", "POF", "HPL", "COM", "MET", "RNAV", "LAW", "AGK", "OPS", "MB", "PERF", "INST", "FPM", "GNAV"]);

export function studyGuideHref(code: string): string | null {
  const upper = code.toUpperCase();
  return STUDY_GUIDE_CODES.has(upper) ? `/${upper.toLowerCase()}-study-guide.html` : null;
}
