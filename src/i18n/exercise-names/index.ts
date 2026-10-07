import type { CatalogNames } from "@/domain/exercises/names";
import type { Locale } from "@/i18n/config";

const cache = new Map<Locale, Promise<CatalogNames>>();

/**
 * Translated catalog names, loaded on demand (≈15 KB compressed) so they don't weigh on app start.
 * English uses the catalog's own names.
 */
export function loadCatalogNames(locale: Locale): Promise<CatalogNames> {
  let names = cache.get(locale);
  if (!names) {
    names =
      locale === "es"
        ? import("./es.json").then((module) => module.default as CatalogNames)
        : Promise.resolve<CatalogNames>({});
    cache.set(locale, names);
  }
  return names;
}
