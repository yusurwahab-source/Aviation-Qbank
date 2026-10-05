"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The spread's photo above its table, and full screen on a tap. The overlay
 * goes in a portal, the rule `CLAUDE.md` keeps for anything fixed and full
 * screen. Inside it the image is shown at its own size in a scrolling box,
 * so a phone's pinch-zoom and a drag are all the controls it needs.
 */
export function PhotoZoom({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full overflow-hidden rounded-lg border border-border bg-surface-muted"
        aria-label="Open the photo full screen"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, not a remote image */}
        <img src={src} alt={alt} className="mx-auto max-h-72 w-auto object-contain" />
        <span className="block py-1 text-center text-xs text-muted-foreground">Tap to zoom</span>
      </button>
      {open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={alt}
              className="fixed inset-0 z-50 flex flex-col bg-background"
            >
              <div className="flex items-center justify-between border-b border-border p-2">
                <p className="px-2 text-sm text-muted-foreground">Pinch or scroll to look closer</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="tap-target rounded-lg border border-border px-4 text-sm font-medium text-foreground"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL */}
                <img src={src} alt={alt} className="max-w-none" />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
