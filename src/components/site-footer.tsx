import Link from "next/link";

import { Logo } from "@/components/logo";
import { siteConfig } from "@/config/site";

/**
 * The application shell's footer.
 *
 * Every link here goes somewhere: the pages behind them are short, but a
 * footer full of dead links is worse than a footer with fewer links in it.
 */

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="safe-bottom mt-12 border-t border-border bg-surface-elevated">
      <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-5">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Link
              href="/"
              className="tap-target inline-flex items-center rounded-lg text-foreground transition hover:text-brand"
            >
              <Logo markClassName="h-6 w-6 text-brand" />
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">{siteConfig.tagline}</p>
            <p className="mt-1 text-xs text-subtle-foreground">
              Type-rating question banks for student pilots. Practice material only — never a
              substitute for the aircraft&rsquo;s approved manuals.
            </p>
          </div>

          <nav aria-label="Footer">
            {/* Two columns at every width. Six links stacked into one made a
                desktop footer taller than the page it sat under. */}
            <ul className="grid grid-cols-2 gap-x-8">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="tap-target inline-flex items-center text-sm text-muted-foreground transition hover:text-brand"
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
