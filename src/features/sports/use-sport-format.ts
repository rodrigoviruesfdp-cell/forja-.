"use client";

import { useFormatter, useTranslations } from "use-intl";
import { METRIC_KEYS } from "@/domain/sports";
import type { Session } from "@/domain/schemas";
import { useSessionFormat } from "@/features/session/use-session-format";
import { useSportName } from "./use-sport-name";

/** One line for a sport session: "1 h 30 min · 8,5 km · 14 olas · Zurriola". */
export function useSportSummary(): (session: Session, placeName?: string | null) => string {
  const t = useTranslations("sportLog");
  const format = useFormatter();
  const fmt = useSessionFormat();
  return (session, placeName) =>
    [
      session.duration_min ? fmt.duration(session.duration_min) : null,
      session.distance_km ? `${format.number(session.distance_km, { maximumFractionDigits: 2 })} km` : null,
      ...METRIC_KEYS.map((key) => {
        const count = session.metrics?.[key];
        return count ? t(`counts.${key}`, { count }) : null;
      }),
      placeName ?? null,
    ]
      .filter(Boolean)
      .join(" · ");
}

/** The title to show for a session: the routine day or sport name it was logged with. */
export function useSessionTitle(): (session: Session) => string {
  const sportName = useSportName();
  const tSession = useTranslations("session");
  return (session) => session.title ?? (session.kind === "sport" ? sportName(session.sport) : tSession("title"));
}
