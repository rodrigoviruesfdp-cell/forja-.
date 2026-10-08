"use client";

import { Toaster as Sonner } from "sonner";
import { resolveDark, usePrefs } from "@/features/preferences/prefs";

/**
 * Stacked notifications (sonner), styled as iOS banners: they drop from the top,
 * translucent material, 22px corners, hairline border.
 */
export function Toaster() {
  const { theme } = usePrefs();
  return (
    <Sonner
      position="top-center"
      theme={theme === "system" ? "system" : resolveDark(theme) ? "dark" : "light"}
      offset={{ top: "calc(env(safe-area-inset-top) + 0.5rem)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 0.5rem)", left: "0.75rem", right: "0.75rem" }}
      gap={10}
      toastOptions={{ className: "forja-toast" }}
      style={
        {
          "--normal-bg": "var(--material-thick)",
          "--normal-border": "var(--border)",
          "--normal-text": "var(--foreground)",
          "--border-radius": "22px",
          "--width": "min(26rem, calc(100vw - 1.5rem))",
        } as React.CSSProperties
      }
    />
  );
}
