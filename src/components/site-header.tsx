import Link from "next/link";

import { HeaderNavLink } from "@/components/header-nav-link";
import { LogoWordmark } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUser } from "@/lib/auth/session";
import { isOwner } from "@/lib/auth/owner";
import { FREE_MODE } from "@/config/free-mode";
import {  } from "@/db/settings";
import { envValue } from "@/lib/env";
import {
  isPillarHidden,
  pillarForHref,
  pillarShortTitle,
  pillarTitle,
} from "@/lib/pillars";
import { getVisibleSiteSettings } from "@/lib/settings-visibility";

/**
 * The application shell's header.
 *
 * It decides one thing on the server — whether anybody is signed in — and
 * hands the answer to the two client components that need it. Practice is
 * open to everyone, so the signed-out header offers a way in rather than
 * demanding one.
 *
 * The lookup is wrapped exactly as the old account menu's was: a header must
 * never be what takes a page down. If the database is unreachable the page
 * itself says so properly, and the header quietly shows the signed-out state
 * meanwhile.
 */

type NavItem = { href: string; label: string; shortLabel?: string };

/** Links that are hidden while the site is free (see `config/free-mode.ts`). */
const PRICING_PATHS = new Set(["/pricing", "/upgrade"]);

const SIGNED_OUT_LINKS: NavItem[] = [
  { href: "/atpl-ground-school", label: "EASA ATPL Ground School" },
  { href: "/aircraft-systems", label: "Aircraft Systems Knowledge" },
  { href: "/pilot-sims", label: "Pilot Sims" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const SIGNED_IN_LINKS: NavItem[] = [
  { href: "/atpl-ground-school", label: "EASA ATPL Ground School" },
  { href: "/aircraft-systems", label: "Aircraft Systems Knowledge" },
  { href: "/pilot-sims", label: "Pilot Sims" },
  { href: "/progress", label: "Progress" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/upgrade", label: "Upgrade" },
];

export async function SiteHeader() {
  let email: string | null = null;

  try {
    email = (await getCurrentUser())?.email ?? null;
  } catch {
    email = null;
  }

  // The owner gets one extra link. Everyone else never learns the area
  // exists — the pages themselves 404 for them regardless, so this is
  // about not advertising a door rather than about locking it.
  const settings = await getVisibleSiteSettings();
  const visible = (links: NavItem[]) =>
    links
      .filter((link) => !(FREE_MODE && PRICING_PATHS.has(link.href)))
      .flatMap((link) => {
      const pillar = pillarForHref(link.href);
      if (!pillar) return [link];
      if (isPillarHidden(settings, pillar)) return [];
      return [
        {
          ...link,
          label: pillarTitle(settings, pillar),
          shortLabel: pillarShortTitle(settings, pillar),
        },
      ];
    });

  const links = visible(
    email
      ? isOwner(email, envValue("OWNER_EMAIL"))
        ? [
            ...SIGNED_IN_LINKS,
            { href: "/aviation-english", label: "Aviation English", shortLabel: "English" },
            { href: "/owner", label: "Owner" },
          ]
        : SIGNED_IN_LINKS
      : SIGNED_OUT_LINKS,
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface-elevated/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2 sm:px-5 sm:py-2.5">
        <Link
          href="/"
          className="tap-target flex shrink-0 items-center rounded-lg text-foreground transition hover:text-brand-ink"
        >
          <LogoWordmark className="h-6" />
        </Link>

        <nav className="ml-3 hidden items-center gap-0.5 lg:flex">
          {links.map((link) => (
            <HeaderNavLink
              key={link.href}
              href={link.href}
              label={link.shortLabel ?? link.label}
            />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {email ? (
            <div className="hidden lg:block">
              <UserMenu email={email} />
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                href="/login"
                className="tap-target inline-flex items-center whitespace-nowrap rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="tap-target inline-flex items-center whitespace-nowrap rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
              >
                Start free
              </Link>
            </div>
          )}

          <MobileNav email={email} links={links} />
        </div>
      </div>
    </header>
  );
}
