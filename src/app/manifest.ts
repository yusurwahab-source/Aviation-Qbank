import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * The web app manifest, which is what lets a student add the question bank
 * to a phone's home screen and open it without browser chrome around it.
 *
 * `start_url` is `/`, not one of the three section pickers: there is no
 * longer a single "the aircraft picker" to land on — a home screen icon has
 * to choose one of `/type-rating`, `/class-rating` or `/flying-knowledge`
 * for someone who has not said which they want today, and the hero on `/`
 * already puts all three one tap away. A test in progress is resumed from
 * its own URL regardless of where the icon lands.
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
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    // Matches `--background` and `--surface-elevated` on the dark theme, so
    // the splash screen and the status bar are the colours the application
    // actually opens in.
    background_color: "#1a2536",
    theme_color: "#1a2536",
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
