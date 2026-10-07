/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheableResponsePlugin, CacheFirst, ExpirationPlugin, Serwist } from "serwist";

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
