/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheableResponsePlugin, CacheFirst, ExpirationPlugin, Serwist } from "serwist";
import { UPDATE_UI_MARKER } from "./update-marker";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Offline strategy:
 *  - The app's pages and static assets are precached on install, so the app
 *    opens instantly and without coverage (pages are just shells; data lives in IndexedDB).
 *  - Exercise photos (public CDN) are kept once seen, so the library works offline too.
 *  - Everything else (Supabase API calls) goes to the network; the app's own
 *    sync engine handles being offline.
 *  - A new version waits until the user taps "Update" (no reloads mid-workout).
 *    Exception: if the device has never run a version with that button (1.1),
 *    nobody could tap it, so the new version takes over and reloads the open pages once.
 */

const exerciseImages: RuntimeCaching = {
  matcher: ({ url }) => url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("/free-exercise-db@"),
  handler: new CacheFirst({
    cacheName: "exercise-images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 600, maxAgeSeconds: 90 * 24 * 60 * 60, purgeOnQuotaError: true }),
    ],
  }),
};
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // Screens that take a query string (?id=...) are the same shell: serve the cached page.
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^(id|date|day|tab)$/],
    cleanupOutdatedCaches: true,
  },
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [exerciseImages, ...defaultCache],
});

serwist.addEventListeners();

let reloadOpenPages = false;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const isUpdate = self.registration.active !== null;
      if (!isUpdate || (await caches.has(UPDATE_UI_MARKER))) return;
      reloadOpenPages = true;
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  if (!reloadOpenPages) return;
  const claimed = self.clients.claim();
  event.waitUntil(claimed);
  // Not part of waitUntil: these navigations are served only once activation has finished.
  void claimed
    .then(() => self.clients.matchAll({ type: "window" }))
    .then((pages) => Promise.all(pages.map((page) => page.navigate(page.url).catch(() => null))));
});
