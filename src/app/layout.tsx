import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ServiceWorker } from "@/components/service-worker";
import { SiteAnnouncement } from "@/components/site-announcement";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeScript } from "@/components/theme-toggle";
import { siteConfig } from "@/config/site";
import { canonicalUrl } from "@/lib/canonical-url";

import { fontDisplay, fontReading } from "./fonts";
import "./globals.css";

const baseUrl = canonicalUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: "/",
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // So that `env(safe-area-inset-*)` reports something on a notched phone;
  // without it the bottom inset is always zero and the footer sits under the
  // home indicator.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1a2536" },
    { media: "(prefers-color-scheme: light)", color: "#f8f9fa" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The theme script sets `data-theme` before React hydrates, which is a
    // difference React would otherwise complain about on the <html> element.
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontReading.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeScript />

        <a
          href="#main"
          className="sr-only rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center"
        >
          Skip to content
        </a>

        <SiteHeader />
        <SiteAnnouncement />

        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-4 sm:px-5 sm:pt-8">
          {children}
        </main>

        <SiteFooter />
        <ServiceWorker />
      </body>
    </html>
  );
}
