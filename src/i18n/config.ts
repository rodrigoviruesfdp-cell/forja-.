import { LOCALES, type Locale } from "@/domain/schemas";
import en from "./messages/en";
import es, { type Messages } from "./messages/es";

export { LOCALES, type Locale };

export const DEFAULT_LOCALE: Locale = "es";

export const MESSAGES: Record<Locale, Messages> = { es, en };

/** First visit: pick the phone's language if we support it. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split("-")[0];
    if ((LOCALES as readonly string[]).includes(base ?? "")) return base as Locale;
  }
  return DEFAULT_LOCALE;
}

export const LOCALE_NAMES: Record<Locale, string> = { es: "Español", en: "English" };
