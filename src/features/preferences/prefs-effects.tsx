"use client";

import { useEffect } from "react";
import { resolveDark, usePrefs } from "./prefs";

const THEME_COLORS = { dark: "#15171a", light: "#eceef1" } as const;

/** Keeps <html> (dark class, lang) and the status bar color in line with the preferences. */
export function PrefsEffects() {
  const { theme, locale } = usePrefs();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const apply = () => {
      const dark = resolveDark(theme);
      document.documentElement.classList.toggle("dark", dark);
      document
        .querySelectorAll('meta[name="theme-color"]')
        .forEach((meta) => meta.setAttribute("content", dark ? THEME_COLORS.dark : THEME_COLORS.light));
    };
    apply();
    if (theme !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [theme]);

  return null;
}
