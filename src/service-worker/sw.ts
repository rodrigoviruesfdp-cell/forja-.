/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

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
 *  - Everything else (Supabase API calls) goes to the network; the app's own
 *    sync engine handles being offline.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // Screens that take a query string (?id=...) are the same shell: serve the cached page.
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^(id|date|day|tab)$/],
    cleanupOutdatedCaches: true,
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
