"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useEffectEvent, useState } from "react";
import { useFormatter, useTranslations } from "use-intl";
import type { PhotoVariant } from "@/data/media/media-sync";
import { bodyWeightOn } from "@/data/repositories/photos";
import { dateOf } from "@/domain/dates";
import { byNewest, timeBetween } from "@/domain/photos";
import type { Media } from "@/domain/schemas";
import { useSessionFormat } from "@/features/session/use-session-format";
import { useUserData } from "@/features/user-data/user-data-context";

/** Your progress photos, newest first. Undefined while loading. */
export function usePhotos(): Media[] | undefined {
  const { db } = useUserData();
  return useLiveQuery(
    async () => (await db.media.where("kind").equals("progress").toArray()).filter((row) => !row.deleted_at).sort(byNewest),
    [db],
  );
}

/**
 * An object URL for a photo (thumbnail or full size), from the phone or downloaded once.
 * Undefined while loading, null if it cannot be had now.
 */
export function usePhotoUrl(row: Media | null | undefined, variant: PhotoVariant): string | null | undefined {
  const { media } = useUserData();
  const [state, setState] = useState<{ key: string; url: string | null } | null>(null);
  const key = row ? `${row.id}:${variant}` : "";
  const load = useEffectEvent(() => (row ? media.blob(row, variant) : Promise.resolve(null)));

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let url: string | null = null;
    void load().then((blob) => {
      if (cancelled) return;
      url = blob ? URL.createObjectURL(blob) : null;
      setState({ key, url });
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [key]);

  return state?.key === key ? state.url : undefined;
}

/** Body weight of each day that has a photo (kg). */
export function useWeightsOn(dates: readonly string[]): Map<string, number> {
  const { db } = useUserData();
  const key = [...new Set(dates)].sort().join(",");
  return (
    useLiveQuery(async () => {
      const weights = new Map<string, number>();
      for (const date of key ? key.split(",") : []) {
        const row = await bodyWeightOn(db, date);
        if (row?.body_weight_kg) weights.set(date, row.body_weight_kg);
      }
      return weights;
    }, [db, key]) ?? new Map()
  );
}

/** How photo screens write dates, time between photos and weight changes. */
export function usePhotoFormat() {
  const t = useTranslations("photos");
  const format = useFormatter();
  const fmt = useSessionFormat();
  return {
    date: (iso: string) => format.dateTime(dateOf(iso), { day: "numeric", month: "long", year: "numeric" }),
    shortDate: (iso: string) => format.dateTime(dateOf(iso), { day: "numeric", month: "short" }),
    month: (yearMonth: string) => format.dateTime(dateOf(`${yearMonth}-01`), { month: "long", year: "numeric" }),
    /** "8 meses y 28 días después", "El mismo día". */
    between: (from: string, to: string) => {
      const { months, days } = timeBetween(from, to);
      if (months === 0 && days === 0) return t("sameDay");
      const parts = [months > 0 ? t("months", { count: months }) : null, days > 0 && months < 3 ? t("days", { count: days }) : null];
      return t("later", { time: format.list(parts.filter((part): part is string => !!part), { type: "conjunction" }) });
    },
    /** "−4,2 kg" / "+1,5 kg" in the user's unit. */
    weightDelta: (kg: number) => `${kg > 0 ? "+" : kg < 0 ? "−" : "±"}${fmt.weight(Math.abs(kg))}`,
    weight: fmt.weight,
  };
}
