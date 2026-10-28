"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { shouldHandleShortcut } from "@/lib/keyboard-shortcuts";
import { cn } from "@/lib/utils";

/**
 * An expandable gallery (21st.dev's "gallery-animation", adapted): a row of
 * panels where the hovered or focused one widens and the rest narrow, and a
 * click opens that item's detail in a dialog with previous/next.
 *
 * Adapted rather than pasted: it takes any content for a panel and its
 * detail, not only an image; its colours are the app's tokens; the dialog is
 * a portal into `body` (see the note on fixed layers in CLAUDE.md); Escape
 * closes it and the arrow keys move between items (not while a form field
 * has focus); motion follows the
 * visitor's reduced-motion setting. Below `lg` the panels stack into one
 * column and only the dialog remains. Each panel is a `@container`, so its
 * content can lay itself out for the width it has been given.
 */
export type GalleryItem = {
  id: string;
  /** Names the panel's button and the dialog. */
  label: string;
  panel: ReactNode;
  detail: ReactNode;
};

export function ExpandableGallery({
  items,
  perRow,
  className,
}: {
  items: readonly GalleryItem[];
  /** How many panels share a row from `lg` up; every item in one row by default. */
  perRow?: number;
  className?: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);

  const size = perRow && perRow > 0 ? perRow : items.length || 1;
  const rows: number[][] = [];
  for (let start = 0; start < items.length; start += size) {
    rows.push(items.slice(start, start + size).map((_, offset) => start + offset));
  }

  const flexFor = (index: number, row: number[]) => {
    if (hoveredIndex === null || !row.includes(hoveredIndex)) return 1;
    return hoveredIndex === index ? 4 : 1;
  };

  const close = () => {
    const returnTo = selectedIndex;
    setSelectedIndex(null);
    if (returnTo !== null) triggers.current[returnTo]?.focus();
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn("flex flex-col gap-2", className)}>
        {rows.map((row) => (
          <div key={row[0]} className="flex flex-col gap-2 lg:h-80 lg:flex-row">
            {row.map((index) => {
              const item = items[index];
              return (
                <motion.button
                  key={item.id}
                  ref={(node) => {
                    triggers.current[index] = node;
                  }}
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={item.label}
                  className="@container relative min-h-20 min-w-0 cursor-pointer overflow-hidden rounded-lg bg-hero-scrim text-left text-on-hero lg:min-h-0"
                  style={{ flex: 1 }}
                  animate={{ flex: flexFor(index, row) }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(index)}
                  onBlur={() => setHoveredIndex(null)}
                  onClick={() => setSelectedIndex(index)}
                >
                  {item.panel}
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-hero-scrim"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: hoveredIndex === null || hoveredIndex === index ? 0 : 0.35 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>

      <GalleryDialog
        items={items}
        index={selectedIndex}
        onClose={close}
        onMove={(step) =>
          setSelectedIndex((current) =>
            current === null ? null : (current + step + items.length) % items.length,
          )
        }
      />
    </MotionConfig>
  );
}

function GalleryDialog({
  items,
  index,
  onClose,
  onMove,
}: {
  items: readonly GalleryItem[];
  index: number | null;
  onClose: () => void;
  onMove: (step: 1 | -1) => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const open = index !== null;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      // A detail can hold a form, where the arrow keys belong to the field.
      else if (!shouldHandleShortcut({ ...event, target: event.target as HTMLElement | null })) return;
      else if (items.length > 1 && event.key === "ArrowRight") onMove(1);
      else if (items.length > 1 && event.key === "ArrowLeft") onMove(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items.length, onClose, onMove]);

  // The server renders no dialog and the first client render must match it,
  // so the portal waits for a render that is known to be in the browser.
  const inBrowser = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  if (!inBrowser) return null;

  const item = index === null ? null : items[index];

  return createPortal(
    <AnimatePresence>
      {item && index !== null ? (
        <motion.div
          key="gallery-dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4"
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            key={item.id}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-lg outline-none"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1">
              <h2 id={titleId} className="truncate text-sm font-semibold text-foreground">
                {item.label}
              </h2>
              <button
                type="button"
                className="tap-target inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                aria-label="Close"
                onClick={onClose}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">{item.detail}</div>

            {items.length > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-border px-2 py-1">
                <GalleryStep direction={-1} onMove={onMove} />
                <span className="text-sm text-muted-foreground tabular-nums">
                  {index + 1} / {items.length}
                </span>
                <GalleryStep direction={1} onMove={onMove} />
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function noSubscription() {
  return () => {};
}

function GalleryStep({ direction, onMove }: { direction: 1 | -1; onMove: (step: 1 | -1) => void }) {
  return (
    <button
      type="button"
      className="tap-target inline-flex items-center gap-1 rounded-full px-3 text-sm font-medium text-brand-ink transition-colors hover:bg-surface-muted"
      onClick={() => onMove(direction)}
    >
      {direction === -1 ? (
        <>
          <span aria-hidden="true">←</span> Previous
        </>
      ) : (
        <>
          Next <span aria-hidden="true">→</span>
        </>
      )}
    </button>
  );
}
