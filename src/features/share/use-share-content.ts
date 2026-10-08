"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useFormatter, useTranslations } from "use-intl";
import { sessionSummary } from "@/data/repositories/sessions";
import { dateOf } from "@/domain/dates";
import { exerciseDisplayName } from "@/domain/exercises/names";
import { byPosition, rotationLetter, rotationOrder, sportDays } from "@/domain/routines/builder";
import { type ShareStat, shareStats } from "@/domain/share";
import type { RoutineDay, Session } from "@/domain/schemas";
import { useCatalogNames } from "@/features/exercises/use-exercises";
import { useRoutineLabels } from "@/features/routines/use-routine-labels";
import type { RoutineTree } from "@/features/routines/use-routines";
import { useWeekdayLabels } from "@/features/routines/weekdays";
import { useSessionFormat } from "@/features/session/use-session-format";
import { useSportName } from "@/features/sports/use-sport-name";
import { useUserData } from "@/features/user-data/user-data-context";
import type { RoutineCard, SessionCard } from "./render";

export interface SessionShare {
  session: Session;
  placeName: string | null;
  card: (showPlace: boolean) => SessionCard;
  /** For the file name: "forja-surf-2026-10-08". */
  fileName: string;
}

const slug = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "forja";

/** Everything the image of a session shows. Undefined while loading, null if it does not exist. */
export function useSessionShare(sessionId: string | null): SessionShare | null | undefined {
  const t = useTranslations("share");
  const tSession = useTranslations("session");
  const format = useFormatter();
  const fmt = useSessionFormat();
  const sportName = useSportName();
  const names = useCatalogNames();
  const { db } = useUserData();

  const data = useLiveQuery(async () => {
    if (!sessionId) return null;
    const session = await db.sessions.get(sessionId);
    if (!session || session.deleted_at) return null;
    const summary = session.kind === "gym" ? await sessionSummary(db, session) : null;
    const place = session.place_id ? await db.places.get(session.place_id) : undefined;
    const recordExercise = summary?.records[0] ? await db.exercises.get(summary.records[0].exerciseId) : undefined;
    return { session, summary, placeName: place?.name ?? null, recordExercise };
  }, [db, sessionId]);

  if (data === undefined || data === null) return data;
  const { session, summary, placeName, recordExercise } = data;

  const value = (stat: ShareStat): string => {
    switch (stat.key) {
      case "duration":
        return fmt.duration(stat.value);
      case "volume":
        return fmt.volume(stat.value);
      case "distance":
        return `${format.number(stat.value, { maximumFractionDigits: 2 })} km`;
      case "effort":
        return `${stat.value}/10`;
      default:
        return format.number(stat.value);
    }
  };

  const title = session.kind === "sport" ? sportName(session.sport) || (session.title ?? "") : (session.title ?? tSession("title"));
  const date = format.dateTime(dateOf(session.date), { weekday: "long", day: "numeric", month: "long" });
  const records = summary?.records ?? [];
  const highlight =
    records.length === 1 && recordExercise
      ? t("record", { exercise: exerciseDisplayName(recordExercise, names) })
      : records.length > 1
        ? t("records", { count: records.length })
        : null;

  return {
    session,
    placeName,
    fileName: `forja-${slug(title)}-${session.date}`,
    card: (showPlace) => ({
      title,
      subtitle: [date.charAt(0).toUpperCase() + date.slice(1), showPlace ? placeName : null].filter(Boolean).join(" · "),
      stats: shareStats(session, summary).map((stat) => ({ label: t(`stats.${stat.key}`), value: value(stat) })),
      highlight,
      photoHint: t("photoHint"),
    }),
  };
}

/** Everything the image of a routine shows. */
export function useRoutineCard(tree: RoutineTree | null | undefined): RoutineCard | null {
  const t = useTranslations("share");
  const labels = useRoutineLabels();
  const weekdays = useWeekdayLabels();
  const sportName = useSportName();
  const names = useCatalogNames();
  if (!tree) return null;
  const { routine, days, exercises, catalog } = tree;
  const rotation = routine.schedule_type === "rotation";
  // A rotation goes A, B, C… then its sports; a week goes Monday → Sunday.
  const ordered = rotation
    ? [...rotationOrder(days), ...sportDays(days)]
    : [...days].sort((a, b) => (a.weekday ?? 7) - (b.weekday ?? 7) || byPosition(a, b));
  const exerciseNames = (dayId: string) =>
    (exercises.get(dayId) ?? []).map((item) => {
      const exercise = catalog.get(item.exercise_id);
      return exercise ? exerciseDisplayName(exercise, names) : "—";
    });
  const badge = (day: RoutineDay, gymIndex: number) => {
    if (rotation && day.kind === "gym") return rotationLetter(gymIndex);
    if (day.weekday !== null) return weekdays.narrow[day.weekday] ?? "";
    return ((day.kind === "sport" ? sportName(day.sport) : "") || day.name).charAt(0).toUpperCase();
  };
  let gymIndex = 0;
  return {
    title: routine.name,
    subtitle: labels.summary(routine, days),
    days: ordered.map((day) => ({
      badge: badge(day, day.kind === "gym" ? gymIndex++ : -1),
      name: day.name,
      exercises: day.kind === "gym" ? exerciseNames(day.id) : [],
      sport: day.kind === "sport",
    })),
    more: (count) => t("more", { count }),
  };
}
