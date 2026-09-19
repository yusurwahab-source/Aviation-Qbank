import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ServiceWorker } from "@/components/service-worker";
import { SiteAnnouncement } from "@/components/site-announcement";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeScript } from "@/components/theme-toggle";
import { siteConfig } from "@/config/site";
import { appUrl } from "@/lib/email/send";

import { fontDisplay, fontReading } from "./fonts";
import "./globals.css";

/**
 * `appUrl()` already knows how to find this deployment's own address — an
 * explicit `APP_URL`, then Vercel's production domain, then localhost. It is
 * reused here rather than duplicated so that a preview deployment's metadata
 * describes the preview, and so the canonical URL and the links in emails can
 * never disagree about where this site is.
 *
 * Its last resort is localhost, which is right in development and wrong in a
 * canonical tag: a production deployment that somehow cannot name itself
 * would otherwise publish `http://localhost:3000` to every crawler that
 * asked. There, the product's own address is the better answer.
 */
function metadataUrl(): string {
  const resolved = appUrl();
  const isLocal = resolved.startsWith("http://localhost");
  return process.env.NODE_ENV === "production" && isLocal ? siteConfig.url : resolved;
}

const baseUrl = metadataUrl();

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
    { media: "(prefers-color-scheme: dark)", color: "#080c14" },
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
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

        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-5">
          {children}
        </main>

        <SiteFooter />
        <ServiceWorker />
      </body>
    </html>
  );
}
