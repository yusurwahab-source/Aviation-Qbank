"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  bottomNavActive,
  bottomNavHidden,
  bottomNavItems,
  type BottomNavItem,
} from "@/lib/bottom-nav";

const ICONS: Record<BottomNavItem["icon"], string> = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  study: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M9 7h6",
  progress: "M4 20V10M10 20V4M16 20v-8M22 20H2",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  login: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3",
};

/** Phone-only bar of the places a student returns to. Hidden from `md` up. */
export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  if (bottomNavHidden(pathname)) return null;
  const items = bottomNavItems(signedIn);

  return (
    <>
      <div aria-hidden="true" className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden" />
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] border-t border-border bg-surface-elevated md:hidden"
      >
        <ul className="mx-auto flex max-w-5xl">
          {items.map((item) => {
            const active = bottomNavActive(pathname, item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`tap-target flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition ${
                    active ? "text-brand-ink" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={ICONS[item.icon]} />
                  </svg>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
