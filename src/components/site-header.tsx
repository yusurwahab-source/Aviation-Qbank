import Link from "next/link";

import { HeaderNavLink } from "@/components/header-nav-link";
import { LogoWordmark } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUser } from "@/lib/auth/session";
import { isOwner } from "@/lib/auth/owner";
import { getSiteSettings } from "@/db/settings";
import { envValue } from "@/lib/env";
import {
  isSectionHidden,
  SECTION_KEYS,
  sectionShortTitle,
  sectionTitle,
  type SectionKey,
} from "@/lib/settings";

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

const SIGNED_OUT_LINKS: NavItem[] = [
  { href: "/type-rating", label: "Type Rating Systems Knowledge" },
  { href: "/class-rating", label: "Class Rating Systems Knowledge" },
  { href: "/flying-knowledge", label: "Flying Knowledge" },
  { href: "/pilot-sims", label: "Pilot Sims" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

const SIGNED_IN_LINKS: NavItem[] = [
  { href: "/type-rating", label: "Type Rating Systems Knowledge" },
  { href: "/class-rating", label: "Class Rating Systems Knowledge" },
  { href: "/flying-knowledge", label: "Flying Knowledge" },
  { href: "/pilot-sims", label: "Pilot Sims" },
  { href: "/progress", label: "Progress" },
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
  const settings = await getSiteSettings();
  const visible = (links: NavItem[]) =>
    links.flatMap((link) => {
      const section = SECTION_KEYS.find(
        (key: SectionKey) => link.href === `/${key}`,
      );
      if (!section) return [link];
      if (isSectionHidden(settings, section)) return [];
      return [
        {
          ...link,
          label: sectionTitle(settings, section),
          shortLabel: sectionShortTitle(settings, section),
        },
      ];
    });

  const links = visible(
    email
      ? isOwner(email, envValue("OWNER_EMAIL"))
        ? [...SIGNED_IN_LINKS, { href: "/owner", label: "Owner" }]
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
