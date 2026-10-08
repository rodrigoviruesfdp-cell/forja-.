import { PREFS_STORAGE_KEY } from "./storage-key";

/**
 * Inline script for <head>: applies the saved theme and language before the first
 * paint so the app never flashes the wrong colors, and marks Apple devices (.apple) so
 * text gets SF Pro's tracking. Tiny and dependency-free.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(
  PREFS_STORAGE_KEY,
)})||"{}");var t=p.theme||"dark";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);if(p.locale)document.documentElement.lang=p.locale;}catch(e){}if(/Macintosh|iPhone|iPad|iPod/.test(navigator.userAgent))document.documentElement.classList.add("apple");})();`;
