"use client";

import { useEffect } from "react";

const SW_VERSION = "v2";
const SW_URL = `/sw.js?v=${SW_VERSION}`;

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

    const register = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const staleRegistrations = registrations.filter((registration) => {
          const scriptUrl =
            registration.active?.scriptURL ??
            registration.waiting?.scriptURL ??
            registration.installing?.scriptURL ??
            "";
          return !scriptUrl.includes(`v=${SW_VERSION}`);
        });

        if (staleRegistrations.length > 0) {
          await Promise.all(staleRegistrations.map((registration) => registration.unregister()));

          // Old workers may have left static caches behind. Removing only our
          // own cache namespace avoids touching unrelated browser data.
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(
              keys.filter((key) => key.startsWith("qbank-static-")).map((key) => caches.delete(key)),
            );
          }
        }

        await navigator.serviceWorker.register(SW_URL);
      } catch {
        // Nothing to tell the student: the site is fully functional without it.
      }
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
