"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { siteConfig } from "@/config/site";
import { contactWidgetHidden, whatsappHref } from "@/lib/contact-links";

/**
 * A small "talk to us" button fixed to the corner of public pages. It opens a
 * panel with the two ways to reach the owner: WhatsApp, and the contact form.
 *
 * It stays out of the way of a test (the phone has its own fixed bar there),
 * of the simulators (full-screen iframes) and of /owner.
 */
export function ContactWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  if (contactWidgetHidden(pathname)) return null;

  const whatsapp = whatsappHref(
    siteConfig.whatsapp.number,
    `Hello ${siteConfig.name}, I have a question.`,
  );

  return (
    <div
      ref={rootRef}
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 flex flex-col items-end gap-3 md:bottom-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Contact us"
          className="w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface-elevated p-4 shadow-lg"
        >
          <p className="text-base font-semibold text-foreground">
            Questions? Talk to us.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            A question is wrong, something is broken, or you want a new
            aircraft? Write to us.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-target inline-flex items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-solid transition hover:bg-brand-strong"
            >
              WhatsApp {siteConfig.whatsapp.display}
            </a>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="tap-target inline-flex items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-foreground transition hover:bg-surface"
            >
              Send a message
            </Link>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Close contact options" : "Contact us"}
        className="tap-target inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand text-on-solid shadow-lg transition hover:bg-brand-strong"
      >
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z" />
          )}
        </svg>
      </button>
    </div>
  );
}
