import { PREFS_STORAGE_KEY } from "./storage-key";

/**
 * Inline script for <head>: applies the saved theme and language before the first
 * paint so the app never flashes the wrong colors. Tiny and dependency-free.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(
  PREFS_STORAGE_KEY,
)})||"{}");var t=p.theme||"dark";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);if(p.locale)document.documentElement.lang=p.locale;}catch(e){}})();`;
