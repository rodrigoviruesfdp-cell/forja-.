import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// Changes on every deploy, so phones download the new version of the cached pages.
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

/** Every screen of the app, precached so it opens without coverage. */
const APP_SHELL_PAGES = ["/today", "/calendar", "/routines", "/progress", "/profile", "/login", "/auth/confirm"];

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/service-worker/sw.ts",
  additionalPrecacheEntries: APP_SHELL_PAGES.map((url) => ({ url, revision })),
  globPatterns: [
    ".next/static/**/*.{js,css,html,ico,png,svg,webp,json,webmanifest}",
    // Fonts too, so the very first offline launch already looks right (Vietnamese subset excluded).
    ".next/static/media/archivo-latin*.woff2",
    "public/**/*",
  ],
  useNativeEsbuild: true,
});
