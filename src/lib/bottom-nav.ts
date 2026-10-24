/**
 * The four destinations in the global mobile bottom navigation bar
 * (`BottomNavBar`), and the pure rules for which one is "active" and when
 * the bar should not render at all. Kept here, pure and tested, rather than
 * inline in the component — the same split `access-policy.ts` and
 * `contact-links.ts` already draw between a rule and the React that uses it.
 */

export type BottomNavItem = {
  href: string;
  label: string;
  /** Whether `pathname` should light this item up as the current one. */
  isActive: (pathname: string) => boolean;
};

export const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  {
    href: "/",
    label: "Home",
    // Exact match only — every other item's own prefix would otherwise
    // also start with "/", and the landing page is not "under" any of them.
    isActive: (pathname) => pathname === "/",
  },
  {
    href: "/aircraft-systems",
    label: "Question Bank",
    // "Question bank" spans every section a student actually answers
    // questions in, not just the one this tab link lands on — ATPL Ground
    // School and Flying Knowledge are question banks too, and a student
    // sitting a test in either should still see this tab lit.
    isActive: (pathname) =>
      ["/aircraft-systems", "/type-rating", "/class-rating", "/atpl-ground-school", "/flying-knowledge"].some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      ),
  },
  {
    href: "/pilot-sims",
    label: "Simulators",
    isActive: (pathname) => pathname === "/pilot-sims" || pathname.startsWith("/pilot-sims/"),
  },
  {
    href: "/progress",
    label: "Statistics",
    isActive: (pathname) => pathname === "/progress" || pathname.startsWith("/progress/"),
  },
];

/**
 * Pages where a fixed full-width bottom bar would sit on top of something
 * that matters, the same reasoning `contactWidgetHidden` applies to its own
 * corner button:
 *
 * - A test runner (`/type-rating/[code]/test` and its two siblings) already
 *   has its own fixed bottom bar — Previous, the question map, Next/Finish
 *   — built for exactly this thumb zone. Two bars stacked there would fight
 *   over the same strip of screen.
 * - A simulator page (`/pilot-sims/<slug>`) is a full-screen iframe whose
 *   own controls may live at the bottom edge; the listing page above it
 *   (`/pilot-sims` itself) is unaffected and keeps the bar.
 * - `/owner` is a desktop console, not a student-facing surface — nothing
 *   here is one of its four destinations anyway.
 */
export function bottomNavHidden(pathname: string): boolean {
  return (
    pathname.startsWith("/owner") || pathname.startsWith("/pilot-sims/") || /\/test(\/|$)/.test(pathname)
  );
}

/** The href of whichever item should read as current, or null for none. */
export function activeBottomNavHref(pathname: string): string | null {
  return BOTTOM_NAV_ITEMS.find((item) => item.isActive(pathname))?.href ?? null;
}
