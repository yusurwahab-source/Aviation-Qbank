"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { logOut } from "@/app/(auth)/actions";

/**
 * Who is signed in, and the way out.
 *
 * A menu rather than a row of links because the email address is long and
 * the sign-out button is pressed rarely — neither earns permanent space in
 * a header that has to survive a 375px screen. The three things a menu has
 * to get right are all here: Escape closes it, a click anywhere else closes
 * it, and focus is visible throughout.
 */
export function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="tap-target flex items-center gap-2 rounded-full px-2.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
      >
        <span
          aria-hidden="true"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold uppercase text-brand-ink"
        >
          {email.slice(0, 1)}
        </span>
        
        <svg
          viewBox="0 0 12 12"
          className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m2.5 4.5 3.5 3.5 3.5-3.5" />
        </svg>
        <span className="sr-only">Account menu</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-md"
        >
          <p className="truncate border-b border-border px-4 py-3 text-xs text-muted-foreground">
            Signed in as
            <br />
            <span className="text-sm font-medium text-foreground">{email}</span>
          </p>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="tap-target flex w-full items-center px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted hover:text-brand-ink"
          >
            Account
          </Link>
          <form action={logOut}>
            <button
              type="submit"
              role="menuitem"
              className="tap-target flex w-full items-center px-4 text-left text-sm font-medium text-foreground transition hover:bg-surface-muted hover:text-brand-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
