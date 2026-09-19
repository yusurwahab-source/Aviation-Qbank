import { Inter, Space_Grotesk } from "next/font/google";

/**
 * Two faces, each with one job.
 *
 * **Space Grotesk** is the interface: headings, buttons, labels, numbers. It
 * is a geometric grotesque with squared-off terminals and open counters —
 * technical without being a novelty face, and its tabular figures keep a
 * clock and a question counter from shuffling as they tick.
 *
 * **Inter** is what questions are set in. It was drawn for screen text at
 * small sizes: a tall x-height, wide apertures, and — the reason it is here
 * rather than the display face — letterforms that stay distinct from one
 * another when somebody has been reading them for two hours. A student reads
 * far more question text than interface, so the reading face is the one
 * decision in this file that actually matters.
 *
 * Both are variable fonts, so a single file per face covers every weight the
 * application uses. `next/font` self-hosts them at build time: nothing is
 * fetched from Google when a student loads a page, and there is no layout
 * shift while a face arrives.
 */

export const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const fontReading = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-read",
});
