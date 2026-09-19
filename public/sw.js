/*
 * Service worker: the app shell and static assets, and nothing else.
 *
 * What it caches: files under /_next/static (content-hashed by the build, so
 * a cached copy can never be stale), the manifest, and image and font files.
 *
 * What it deliberately does not cache, and must not start caching:
 *
 *   - HTML documents. Every page in this application is rendered per
 *     request and most of them differ by who is signed in. A cached document
 *     would show one student's header, allowance or progress to the next
 *     person to open the app on that device.
 *   - Anything under /api, and any non-GET request. Answers, sign-ins and
 *     Stripe's webhook are not cacheable events; serving one from a cache
 *     would mean recording an answer that never reached the server.
 *   - Question data. Out of scope by instruction, and out of scope by
 *     design: the answer key travels one question at a time in reply to an
 *     answer, and a cache is exactly the wrong place for it.
 *
 * Everything not matched here falls through with no `respondWith` call,
 * which leaves the browser to fetch it from the network as though no worker
 * were installed at all.
 */

const VERSION = "v1";
const STATIC_CACHE = `qbank-static-${VERSION}`;

/** Files worth having before the first offline load. Never a page. */
const PRECACHE = ["/manifest.webmanifest"];

const STATIC_FILE = /\.(?:css|js|woff2?|ttf|png|jpe?g|gif|svg|webp|avif|ico)$/i;

function isStaticAsset(url) {
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (PRECACHE.includes(url.pathname)) return true;
  return STATIC_FILE.test(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Never fail an install over one asset: a worker that will not install
      // is worse than one with a cold cache.
      await Promise.allSettled(PRECACHE.map((path) => cache.add(path)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (!isStaticAsset(url)) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      const response = await fetch(request);

      // Only a complete, successful, same-origin response is worth keeping.
      if (response.ok && response.type === "basic") {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, response.clone());
      }

      return response;
    })(),
  );
});
