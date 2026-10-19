/**
 * Where the phone's bottom navigation bar stands down. Pure, like
 * `contactWidgetHidden`, so it is asserted rather than trusted.
 *
 * A test has its own fixed bar, /owner is a desk tool, and the simulators are
 * full-screen iframes.
 */
export function bottomNavHidden(pathname: string): boolean {
  return (
    pathname.startsWith("/owner") ||
    pathname.startsWith("/pilot-sims/") ||
    /\/test(\/|$)/.test(pathname)
  );
}

export type BottomNavItem = { href: string; label: string; icon: "home" | "study" | "progress" | "account" | "login" };

/** Signed-out visitors get Home, Study and a way in; the rest needs an account. */
export function bottomNavItems(signedIn: boolean): BottomNavItem[] {
  return signedIn
    ? [
        { href: "/", label: "Home", icon: "home" },
        { href: "/atpl-ground-school", label: "Study", icon: "study" },
        { href: "/progress", label: "Progress", icon: "progress" },
        { href: "/account", label: "Account", icon: "account" },
      ]
    : [
        { href: "/", label: "Home", icon: "home" },
        { href: "/atpl-ground-school", label: "Study", icon: "study" },
        { href: "/login", label: "Log in", icon: "login" },
      ];
}

export function bottomNavActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
