"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { logOut } from "@/app/(auth)/actions";
import { HeroButton } from "@/components/ui/hero-button";

/**
 * The header on a phone: one button, and everything else behind it.
 *
 * A sheet rather than a wrapped row of links. At 375px the full navigation
 * either wraps to three lines or shrinks below a size a thumb can hit, and
 * both are worse than a single 44px control that opens something big enough
 * to read.
 *
 * Auth state is passed down from the server header rather than fetched here
 * — this component has to be a client component to hold the open/closed
 * state, and a client component cannot read a session cookie.
 */

type NavLink = { href: string; label: string };

/**
 * Three loose groups rather than one flat list of seven-plus links: the
 * content-bearing pillars (what a visitor is actually here to study), the
 * student's own account (where they are in it), then the short pages
 * everyone eventually needs. Grouping by href rather than by a field on
 * `NavLink` keeps `site-header.tsx`'s own link-building logic — hidden
 * pillars, the owner's extra links, free-mode's pricing filter — untouched;
 * this only decides how to lay out whatever it is handed.
 */
const GROUP_1_HREFS = new Set([
  "/atpl-ground-school",
  "/aircraft-systems",
  "/pilot-sims",
  "/aviation-english",
  "/blog",
  "/articles",
]);
const GROUP_2_HREFS = new Set(["/progress", "/pricing", "/upgrade", "/account"]);

function groupLinks(links: NavLink[]): [NavLink[], NavLink[], NavLink[]] {
  const group1 = links.filter((link) => GROUP_1_HREFS.has(link.href));
  const group2 = links.filter((link) => GROUP_2_HREFS.has(link.href));
  const placed = new Set([...group1, ...group2].map((link) => link.href));
  const group3 = links.filter((link) => !placed.has(link.href));
  return [group1, group2, group3];
}

export function MobileNav({ email, links }: { email: string | null; links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [shownFor, setShownFor] = useState(pathname);

  // "Account" is not one of the server-built `links` — it has no section or
  // owner-visibility logic of its own — so it is added here, right where it
  // is grouped with Progress, rather than threaded through site-header.tsx.
  const groups = groupLinks(email ? [...links, { href: "/account", label: "Account" }] : links);

  // Following a link inside the sheet has to close it: the route changes
  // without this component unmounting, so nothing else would. Adjusted
  // during render rather than in an effect — an effect would paint the sheet
  // over the new page first and then remove it. This also covers a back
  // gesture, which an onClick on each link would miss.
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    // The page behind a sheet must not scroll under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label="Open menu"
        className="tap-target inline-flex items-center justify-center rounded-full text-foreground transition hover:bg-surface-muted lg:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
        </svg>
      </button>

      {/*
        Rendered into <body> rather than in place. The header it sits in is
        `backdrop-blur`, and a `backdrop-filter` makes an element the
        containing block for every fixed-position descendant — so `inset-0`
        here resolved against the 64px header instead of the viewport, and
        the sheet was clipped to the height of its own title bar. A portal
        is also simply where a modal layer belongs: it cannot be trapped by
        a parent's stacking context or overflow.

        `document.body` is safe to name here because this branch is only
        ever reached after a click in the browser; it is never evaluated
        while rendering on the server.
      */}
      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                type="button"
                tabIndex={-1}
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              />

              <div className="safe-bottom font-reading absolute inset-x-0 top-0 max-h-full overflow-y-auto border-b border-border bg-surface-elevated px-5 pt-4 shadow-md">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Menu
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="tap-target -mr-2 inline-flex items-center justify-center rounded-lg text-muted-foreground transition hover:text-brand-ink"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="m6 6 12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>

                <nav className="mt-4 flex flex-col">
                  {groups.map((group, index) =>
                    group.length === 0 ? null : (
                      <div
                        key={index}
                        className={`flex flex-col gap-y-3 ${
                          index === 0 ? "" : "mt-4 border-t border-border pt-4"
                        }`}
                      >
                        {group.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={`tap-target flex items-center text-base font-medium transition hover:text-brand-ink ${
                              pathname === link.href ? "text-brand-ink" : "text-foreground"
                            }`}
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    ),
                  )}
                </nav>

                <div className="mt-4 border-t border-border pb-4 pt-4">
                  {email ? (
                    <>
                      <p className="truncate text-xs text-muted-foreground">
                        Signed in as <span className="text-foreground">{email}</span>
                      </p>
                      <form action={logOut} className="mt-2">
                        <button
                          type="submit"
                          className="tap-target -ml-1 px-1 text-sm font-medium text-muted-foreground transition hover:text-brand-ink"
                        >
                          Sign out
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Link
                        href="/login"
                        className="tap-target flex items-center justify-center rounded-full border border-border px-4 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand-ink"
                      >
                        Log in
                      </Link>
                      <HeroButton asChild size="sm" showArrow={false} fullWidth className="hb-nowrap"><Link href="/signup">
                        Start free
                      </Link></HeroButton>
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
