"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";

import { activeBottomNavHref, bottomNavHidden, BOTTOM_NAV_ITEMS } from "@/lib/bottom-nav";

/**
 * The thumb-zone replacement for a top menu on a phone: a fixed bar across
 * the bottom of the screen with the four places a student actually goes —
 * Home, the question bank, Simulators, Statistics — mounted once in
 * `layout.tsx` beside the header rather than per page.
 *
 * It supplements the header's own mobile sheet (`MobileNav`) rather than
 * replacing it outright: signing in, the account menu, Contact, Pricing and
 * the owner link still live there, because four icons cannot carry the
 * whole site and should not try to. This bar is for the handful of
 * destinations worth one tap from anywhere.
 *
 * `bottomNavHidden` keeps it off the handful of pages that already own this
 * exact strip of screen — a test runner's own Previous/map/Next bar most of
 * all; stacking two fixed bars at the bottom would have them fight over the
 * same thumb zone. `activeBottomNavHref` is a separate pure function because
 * "which tab is active" is a wider question than "which tab was tapped" —
 * a student mid-test on `/flying-knowledge/MET/test` is still inside the
 * question bank, which is the item that should read as current.
 */
export function BottomNavBar() {
  const pathname = usePathname();

  if (bottomNavHidden(pathname)) return null;

  const activeHref = activeBottomNavHref(pathname);

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-elevated/95 backdrop-blur lg:hidden"
    >
      <div className="mx-auto grid w-full max-w-5xl grid-cols-4">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`tap-target flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition ${
                active ? "text-brand-ink" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <NavIcon item={item.href} className="h-6 w-6" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function NavIcon({ item, className }: { item: string; className: string }): ReactElement {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };

  switch (item) {
    case "/":
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5" />
          <path d="M6 9.5V19a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1V9.5" />
        </svg>
      );
    case "/aircraft-systems":
      return (
        <svg {...common}>
          <path d="M12 6.5c-2.2-1.6-5.2-2-8-1v12c2.8-1 5.8-.6 8 1 2.2-1.6 5.2-2 8-1v-12c-2.8-1-5.8-.6-8 1z" />
          <path d="M12 6.5v12" />
        </svg>
      );
    case "/pilot-sims":
      return (
        <svg {...common}>
          <path d="M4.5 16a7.5 7.5 0 1 1 15 0" />
          <path d="M12 16l3.5-3.5" />
          <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "/progress":
      return (
        <svg {...common}>
          <path d="M5 19v-7" />
          <path d="M12 19V6" />
          <path d="M19 19v-4.5" />
        </svg>
      );
    default:
      return <svg {...common} />;
  }
}
