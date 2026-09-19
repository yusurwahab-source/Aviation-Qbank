"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { logOut } from "@/app/(auth)/actions";

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

export function MobileNav({ email, links }: { email: string | null; links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [shownFor, setShownFor] = useState(pathname);

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
        className="tap-target inline-flex items-center justify-center rounded-lg border border-border text-foreground transition hover:border-brand hover:text-brand md:hidden"
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
            <div className="fixed inset-0 z-50 md:hidden">
              <button
                type="button"
                tabIndex={-1}
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              />

              <div className="safe-bottom absolute inset-x-0 top-0 max-h-full overflow-y-auto border-b border-border bg-surface-elevated px-5 pt-4 shadow-md">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Menu
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="tap-target -mr-2 inline-flex items-center justify-center rounded-lg text-muted-foreground transition hover:text-brand"
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

                <nav className="mt-3 flex flex-col">
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`tap-target flex items-center border-b border-border text-base font-medium transition hover:text-brand ${
                        pathname === link.href ? "text-brand" : "text-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                <div className="mt-4 pb-4">
                  {email ? (
                    <>
                      <p className="truncate text-xs text-muted-foreground">
                        Signed in as <span className="text-foreground">{email}</span>
                      </p>
                      <form action={logOut} className="mt-2">
                        <button
                          type="submit"
                          className="tap-target w-full rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
                        >
                          Sign out
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Link
                        href="/login"
                        className="tap-target flex items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand"
                      >
                        Log in
                      </Link>
                      <Link
                        href="/signup"
                        className="tap-target flex items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
                      >
                        Sign up
                      </Link>
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
