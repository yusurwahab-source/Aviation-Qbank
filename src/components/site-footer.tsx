import Link from "next/link";

import { FooterGlobe } from "@/components/footer-globe";
import { LogoWordmark } from "@/components/logo";
import { FREE_MODE } from "@/config/free-mode";
import { siteConfig } from "@/config/site";

/**
 * The application shell's footer, dressed like the homepage hero: a navy
 * band in both themes (`.site-footer` takes the dark palette in
 * globals.css, the same way the header does over the hero), the yellow
 * hero tagline and the header's pill links on the left, and a slowly
 * turning globe on the right where the hero has its instruments, under the
 * same navy scrim from the left so the text always reads.
 *
 * Every link here goes somewhere: the pages behind them are short, but a
 * footer full of dead links is worse than a footer with fewer links in it.
 */

const ALL_LINKS = [
  { href: "/blog", label: "Blogs" },
  { href: "/articles", label: "Articles" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/contact", label: "Contact" },
];

// The pricing page is hidden while the site is free (`config/free-mode.ts`).
const LINKS = ALL_LINKS.filter((link) => !(FREE_MODE && link.href === "/pricing"));

export function SiteFooter() {
  return (
    <footer className="site-footer safe-bottom relative isolate mt-12 overflow-hidden bg-hero-scrim text-foreground">
      <FooterGlobe className="absolute -bottom-36 -right-24 -z-10 w-72 text-hero-accent opacity-50 sm:-bottom-52 sm:right-[-6rem] sm:w-[28rem] sm:opacity-70 lg:right-[max(-2rem,calc(50%-34rem))]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-hero-scrim via-hero-scrim/70 to-transparent"
      />

      <div className="mx-auto w-full max-w-5xl px-4 pt-10 sm:px-5">
        <div className="max-w-md">
          <Link
            href="/"
            className="tap-target inline-flex items-center rounded-lg text-foreground transition hover:opacity-90"
          >
            <LogoWordmark className="h-6" />
          </Link>
          <p className="mt-2 text-sm font-medium tracking-wide text-hero-accent">
            {siteConfig.tagline}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Practice question banks for student pilots. Practice material only — never a
            substitute for the aircraft&rsquo;s approved manuals.
          </p>

          <nav aria-label="Footer" className="mt-5">
            {/* The header's pill links, wrapping; the right half is the globe's. */}
            <ul className="-mx-3 flex flex-wrap">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="tap-target inline-flex items-center whitespace-nowrap rounded-full px-3 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-6 border-t border-border py-5 text-xs text-subtle-foreground">
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
      </div>
    </footer>
  );
}
