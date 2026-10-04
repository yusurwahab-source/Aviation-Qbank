"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { subscriptionBenefits, UPGRADE_PROMPT_PRICE } from "@/config/pricing";

/**
 * The "here is what a subscription gets you" dialog.
 *
 * It appears once a few seconds after somebody without access lands on a
 * page — signed in or not, because what a subscription is should be clear
 * before anyone has made an account — and then stays away for `SNOOZE_DAYS` whether they
 * dismissed it or followed it. The server decides *whether* it may ever
 * show (`UpgradePrompt`: signed in, no active subscription); this only
 * decides *when*.
 *
 * Three places never get it. `/upgrade`, `/redeem` and the auth pages are
 * where the answer already is. A test in progress is the one place an
 * interruption costs the student something — a modal over a question they
 * are reading is worse than a missed sales message — so any `/test` route
 * is skipped, and the timer restarts if they navigate out of one.
 *
 * `localStorage` throws in a locked-down browser, so every use is guarded:
 * somebody who cannot save the snooze simply sees it once per page load,
 * which is the worst case, and never an error.
 */

const STORAGE_KEY = "pilotqbank:upgrade-prompt-snoozed-until";
const SHOW_AFTER_MS = 5000;
const SNOOZE_DAYS = 3;

/** The pricing page is where somebody has gone to read exactly this, so it
 * opens at once and ignores the snooze. */
const IMMEDIATE_PATHS = ["/pricing"];

const QUIET_PREFIXES = ["/upgrade", "/redeem", "/login", "/signup", "/forgot-password", "/reset-password", "/owner"];

function isQuietPath(pathname: string): boolean {
  if (QUIET_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  return /\/test\/?$/.test(pathname);
}

function snoozed(): boolean {
  try {
    const until = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function snooze(): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000),
    );
  } catch {
    // Nothing to do: see the note above.
  }
}

export function UpgradePromptDialog({
  freeQuestions,
  signedIn,
}: {
  freeQuestions: number;
  /** Signed out, the way on is an account first and checkout second. */
  signedIn: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isQuietPath(pathname)) return;
    const immediate = IMMEDIATE_PATHS.includes(pathname);
    if (!immediate && snoozed()) return;
    const timer = window.setTimeout(() => setOpen(true), immediate ? 0 : SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const dismiss = useCallback(() => {
    snooze();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-prompt-title"
        className="safe-bottom relative w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="tap-target absolute right-2 top-2 inline-flex items-center justify-center rounded-lg px-3 text-muted-foreground transition hover:text-foreground"
        >
          <span aria-hidden="true" className="text-xl leading-none">
            ×
          </span>
        </button>

        <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink">Full access</p>
        <h2 id="upgrade-prompt-title" className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Unlock every subject and tool
        </h2>

        <p className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-foreground">{UPGRADE_PROMPT_PRICE.amount}</span>
          <span className="text-sm text-muted-foreground">{UPGRADE_PROMPT_PRICE.period}</span>
        </p>
        <p className="text-xs text-subtle-foreground">{UPGRADE_PROMPT_PRICE.note}</p>

        <ul className="mt-5 space-y-3 text-sm text-foreground">
          {subscriptionBenefits(freeQuestions).map((benefit) => (
            <li key={benefit.title} className="flex gap-3">
              <Tick />
              <span>
                <strong className="font-semibold">{benefit.title}</strong> — {benefit.body}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href={signedIn ? "/upgrade" : "/signup"}
            onClick={snooze}
            className="tap-target inline-flex items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
          >
            {signedIn ? "See plans and subscribe" : "Create a free account"}
          </Link>
          {signedIn ? null : (
            <Link
              href="/login"
              onClick={snooze}
              className="tap-target inline-flex items-center justify-center rounded-lg border border-border px-6 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand-ink"
            >
              Log in to subscribe
            </Link>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="tap-target inline-flex items-center justify-center rounded-lg px-6 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

function Tick() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="mt-0.5 h-5 w-5 shrink-0 text-correct"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 10.5 8.2 14.5 16 6" />
    </svg>
  );
}
