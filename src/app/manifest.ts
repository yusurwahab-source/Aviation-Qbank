import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * The web app manifest, which is what lets a student add the question bank
 * to a phone's home screen and open it without browser chrome around it.
 *
 * `start_url` is the aircraft picker, not the marketing page at `/` or a
 * test: an icon tapped cold should land somewhere that makes sense whether
 * or not a test was in progress, and a test is resumed from its own URL
 * anyway. `/` is the right first visit for a browser tab, but a poor choice
 * for an icon someone already installed — they have already been sold on
 * the product, and landing them on the pitch again every time is friction
 * with nothing to gain from it.
 *
 * The icons are static files in `public/`, written by
 * `npm run icons:generate`, rather than the generated `/icon` route: a
 * manifest needs a stable URL for an icon, and a generated route's URL
 * carries a build hash.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — ${siteConfig.tagline}`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/aircraft",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    // Matches `--background` and `--surface-elevated` on the dark theme, so
    // the splash screen and the status bar are the colours the application
    // actually opens in.
    background_color: "#080c14",
    theme_color: "#080c14",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
