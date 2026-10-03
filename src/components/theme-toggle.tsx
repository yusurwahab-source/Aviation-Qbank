"use client";

import { useCallback } from "react";

/**
 * Switches between the dark and light themes.
 *
 * The choice is written to `data-theme` on `<html>`, which is what
 * `globals.css` keys the light palette off, and remembered in
 * `localStorage` so it survives a reload. Every `localStorage` call is
 * wrapped: the API throws outright in a locked-down browser (Safari's
 * private mode has historically, and a blocked-cookies setting still does),
 * and a student who cannot save a preference must still be able to use the
 * button for the session they are in.
 *
 * Which icon to show is decided in CSS, not in React state — see
 * `globals.css`. The server cannot know the theme, so a state-driven icon
 * would either flash or mismatch on hydration; a CSS rule keyed on the same
 * attribute as the palette itself is correct from the first paint and needs
 * no effect to settle it.
 */

const STORAGE_KEY = "qbank-theme";

export function ThemeToggle() {
  const toggle = useCallback(() => {
    const root = document.documentElement;

    // With no attribute set the theme is whatever the OS asked for, so that
    // is what we are toggling away from.
    const current =
      root.dataset.theme ??
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    const next = current === "light" ? "dark" : "light";

    root.dataset.theme = next;

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable. The theme still changed for this session, which
      // is the part the student asked for.
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between the dark and light theme"
      title="Switch theme"
      className="tap-target inline-flex items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-brand hover:text-brand-ink"
    >
      {/* Shown on the dark theme: press for light. */}
      <svg
        viewBox="0 0 24 24"
        className="icon-when-dark h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.6v2.2M12 19.2v2.2M21.4 12h-2.2M4.8 12H2.6M18.6 5.4l-1.6 1.6M7 17l-1.6 1.6M18.6 18.6L17 17M7 7 5.4 5.4" />
      </svg>

      {/* Shown on the light theme: press for dark. */}
      <svg
        viewBox="0 0 24 24"
        className="icon-when-light h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" />
      </svg>
    </button>
  );
}

/**
 * Applies the remembered theme before the first paint.
 *
 * This has to be a blocking inline script in the document head. Anything
 * that waits for React — an effect, a client component's first render —
 * runs after the browser has already painted, so a student who chose light
 * would watch the page arrive dark and then flip. Reading one key and
 * setting one attribute is a fraction of a millisecond, which is the trade
 * being made here.
 *
 * It deliberately sets nothing when there is no stored choice: an absent
 * attribute is what lets `prefers-color-scheme` decide, which is the
 * behaviour somebody who has never touched the toggle should get.
 */
export function ThemeScript() {
  const script = `
try {
  var t = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
} catch (e) {}
`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
