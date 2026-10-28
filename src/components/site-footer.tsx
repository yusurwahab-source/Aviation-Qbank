import Link from "next/link";

import { FooterGlobe } from "@/components/footer-globe";
import { LogoWordmark } from "@/components/logo";
import { FREE_MODE } from "@/config/free-mode";
import { siteConfig } from "@/config/site";

/**
 * The application shell's footer, dressed like the homepage hero: a navy
 * band in both themes (`.site-footer` takes the dark palette in
 * globals.css, the same way the header does over the hero), the yellow
 * hero tagline, structured navigation columns, and a slowly turning globe.
 */

const TRAINING_LINKS = [
  { href: "/atpl-ground-school", label: "EASA ATPL Ground School" },
  { href: "/aircraft-systems", label: "Aircraft Systems" },
  { href: "/type-rating", label: "Type Ratings" },
  { href: "/class-rating", label: "Class Ratings" },
  { href: "/pilot-sims", label: "Flight Training Tools" },
  { href: "/tools/logbook", label: "Logbook Scanner" },
  { href: "/tools/ai-search", label: "AI Search" },
];

const RESOURCE_LINKS = [
  { href: "/articles", label: "Articles" },
  { href: "/blog", label: "Blogs" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const LEGAL_LINKS = [
  { href: "/pricing", label: "Pricing", paidOnly: true },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteFooter() {
  const visibleLegalLinks = LEGAL_LINKS.filter((link) => !(FREE_MODE && link.paidOnly));

  return (
    <footer className="site-footer safe-bottom relative isolate mt-12 overflow-hidden bg-hero-scrim text-foreground">
      <FooterGlobe className="absolute -bottom-36 -right-24 -z-10 w-72 text-hero-accent opacity-40 sm:-bottom-52 sm:right-[-6rem] sm:w-[28rem] sm:opacity-60 lg:right-[max(-2rem,calc(50%-34rem))]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-hero-scrim via-hero-scrim/80 to-transparent"
      />

      <div className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-5">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand & Overview */}
          <div className="max-w-sm lg:col-span-5">
            <Link
              href="/"
              className="tap-target inline-flex items-center rounded-lg text-foreground transition hover:opacity-90"
            >
              <LogoWordmark className="h-6" />
            </Link>
            <p className="mt-2 text-sm font-semibold tracking-wide text-hero-accent">
              {siteConfig.tagline}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Dedicated question banks and study materials for student pilots and flight crew.
              Engineered for conceptual understanding and system knowledge, not simple question memorisation.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/5 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-hero-accent" />
              <span>EASA Syllabus &amp; Type Rating Preparation</span>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-hero-accent">
                Training
              </p>
              <ul className="mt-3 space-y-2">
                {TRAINING_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-muted-foreground transition hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-hero-accent">
                Resources
              </p>
              <ul className="mt-3 space-y-2">
                {RESOURCE_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-muted-foreground transition hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-hero-accent">
                Platform
              </p>
              <ul className="mt-3 space-y-2">
                {visibleLegalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-muted-foreground transition hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border/80 pt-6 pb-6 text-xs text-subtle-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p>© {new Date().getFullYear()} {siteConfig.name}. Practice and study material only — never a substitute for approved AFM/FCOM.</p>
          <p className="font-mono text-[11px] text-muted-foreground/80">Flight Ready · Ground School Complete</p>
        </div>
      </div>
    </footer>
  );
}
