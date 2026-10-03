"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * One link in the header's desktop navigation.
 *
 * The page you are on is marked in the accent — white text, a yellow bar
 * under it — and every other link stays muted, so the yellow means "you are
 * here" and is never competing with a primary button for attention. It is
 * the only reason this is a client component: the header itself is a server
 * component and cannot know the pathname.
 *
 * A section link is active for everything beneath it (`/type-rating/B737`
 * lights `/type-rating`), and `aria-current` says the same to a screen
 * reader that the bar says to everyone else.
 */
export function HeaderNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`tap-target relative inline-flex items-center rounded-lg px-3 text-sm font-medium transition hover:bg-surface-muted hover:text-foreground ${
        active ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      {label}
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-brand"
        />
      ) : null}
    </Link>
  );
}
