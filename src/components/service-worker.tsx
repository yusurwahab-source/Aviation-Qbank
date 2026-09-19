"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in `public/sw.js`.
 *
 * Production only. In development the worker would sit in front of a dev
 * server that is already rewriting assets on every save, and the first
 * confusing bug it caused would cost more than it saves.
 *
 * Registration is deliberately quiet: a browser with no service worker
 * support, a private window that refuses one, or an insecure origin all end
 * up in the same place — the application works exactly as it did before,
 * because everything the worker does is an optimisation over a network the
 * app can always reach itself.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Nothing to tell the student: the site is fully functional without it.
      });
    };

    // After load, so registering never competes with the first paint.
    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
