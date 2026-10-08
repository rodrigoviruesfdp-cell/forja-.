"use client";

import { useTranslations } from "use-intl";
import { canonicalSport, isSportKey } from "@/domain/sports";

/** Name to show for a stored sport: translated if it is a known code, as typed otherwise. */
export function useSportName(): (value: string | null | undefined) => string {
  const t = useTranslations("sports");
  return (value) => {
    if (!value) return "";
    const key = canonicalSport(value);
    return isSportKey(key) ? t(key) : value;
  };
}
