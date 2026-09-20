import Link from "next/link";

import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUser } from "@/lib/auth/session";
import { isOwner } from "@/lib/auth/owner";
import { envValue } from "@/lib/env";

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

const SIGNED_OUT_LINKS = [
  { href: "/aircraft?category=type-rating", label: "Type ratings" },
  { href: "/aircraft?category=light-aircraft", label: "Light aircraft" },
  { href: "/aircraft?category=flying-knowledge", label: "Flying knowledge" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

const SIGNED_IN_LINKS = [
  { href: "/aircraft?category=type-rating", label: "Type ratings" },
  { href: "/aircraft?category=light-aircraft", label: "Light aircraft" },
  { href: "/aircraft?category=flying-knowledge", label: "Flying knowledge" },
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
  const links = email
    ? isOwner(email, envValue("OWNER_EMAIL"))
      ? [...SIGNED_IN_LINKS, { href: "/owner", label: "Owner" }]
      : SIGNED_IN_LINKS
    : SIGNED_OUT_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface-elevated/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2.5 sm:px-5">
        <Link
          href="/"
          className="tap-target flex items-center rounded-lg text-foreground transition hover:text-brand"
        >
          <Logo markClassName="h-7 w-7 text-brand" />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="tap-target inline-flex items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {email ? (
            <div className="hidden md:block">
              <UserMenu email={email} />
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/login"
                className="tap-target inline-flex items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="tap-target inline-flex items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
              >
                Sign up
              </Link>
            </div>
          )}

          <MobileNav email={email} links={links} />
        </div>
      </div>
    </header>
  );
}
