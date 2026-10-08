"use client";

import { MapPin, Share, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useFormatter, useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Drawer } from "@/components/ui/drawer";
import { TextAreaRow, TextRow } from "@/components/ui/form-rows";
import { Group, GroupRow } from "@/components/ui/group";
import { Stepper } from "@/components/ui/stepper";
import { cleanPlaceName, findPlace } from "@/domain/places";
import { dateOf, localDate } from "@/domain/dates";
import { type PlaceChoice, deleteSession, saveSportSession } from "@/data/repositories/sessions";
import { canonicalSport, METRIC_MAX, type MetricKey, SPORT_KEYS, sportProfile } from "@/domain/sports";
import type { RoutineDay, Session } from "@/domain/schemas";
import { parseDecimal } from "@/domain/units";
import { usePrefs } from "@/features/preferences/prefs";
import { RpePicker } from "@/features/session/rpe-picker";
import { setNavDirection } from "@/features/shell/nav-direction";
import { useUserData } from "@/features/user-data/user-data-context";
import { usePlaceNames, usePlacesFor } from "./use-places";
import { useSportName } from "./use-sport-name";

export type SportSheetTarget =
  | {
      mode: "new";
      /** yyyy-mm-dd (today or a past day). */
      date: string;
      /** The planned sport day it fulfils, if any. */
      day?: RoutineDay | null;
    }
  | { mode: "edit"; session: Session };

const QUICK_MINUTES = [30, 45, 60, 90, 120];
const SPOTS_SHOWN = 8;

/**
 * Log a sport by hand: which, which day (today or before), how long, how far, what the sport
 * counts (waves, rounds…), where, how hard and notes. Everything but the sport is optional.
 */
export function SportSheet({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: SportSheetTarget | null;
}) {
  const t = useTranslations("sportLog");
  const common = useTranslations("common");
  const placeNames = usePlaceNames();
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={target?.mode === "edit" ? t("editTitle") : t("newTitle")}
      closeLabel={common("cancel")}
      tall
    >
      {target && placeNames ? (
        <SportForm
          key={target.mode === "edit" ? target.session.id : `${target.date}-${target.day?.id ?? "free"}`}
          target={target}
          placeName={target.mode === "edit" && target.session.place_id ? (placeNames.get(target.session.place_id) ?? "") : ""}
          close={() => onOpenChange(false)}
        />
      ) : null}
    </Drawer>
  );
}

function numberText(value: number | null | undefined, locale: string): string {
  if (!value) return "";
  return locale === "es" ? String(value).replace(".", ",") : String(value);
}

function SportForm({ target, placeName, close }: { target: SportSheetTarget; placeName: string; close: () => void }) {
  const t = useTranslations("sportLog");
  const tShare = useTranslations("share");
  const router = useRouter();
  const tSession = useTranslations("session");
  const tSports = useTranslations("sports");
  const common = useTranslations("common");
  const format = useFormatter();
  const sportName = useSportName();
  const { locale } = usePrefs();
  const { db, user } = useUserData();

  const existing = target.mode === "edit" ? target.session : null;
  const day = target.mode === "new" ? (target.day ?? null) : null;
  const [sport, setSport] = useState(sportName(existing?.sport ?? day?.sport ?? null));
  const [date, setDate] = useState(existing?.date ?? (target.mode === "new" ? target.date : localDate(new Date())));
  const [minutes, setMinutes] = useState(existing?.duration_min ? String(existing.duration_min) : "");
  const [distance, setDistance] = useState(numberText(existing?.distance_km, locale));
  const [metrics, setMetrics] = useState<Record<string, number>>(existing?.metrics ?? {});
  const [placeText, setPlaceText] = useState(placeName);
  const [rpe, setRpe] = useState<number | null>(existing?.rpe ?? null);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const code = canonicalSport(sport);
  const profile = sportProfile(code || "x");
  const places = usePlacesFor(code);
  const today = localDate(new Date());
  const placeLabel = profile.placeLabel === "spot" ? t("spot") : t("place");
  const typedPlace = cleanPlaceName(placeText);
  const matching = places.filter((place) => !typedPlace || place.name.toLowerCase().includes(typedPlace.toLowerCase()));
  const exact = typedPlace ? findPlace(places, typedPlace) : undefined;
  const canSave = code.trim() !== "" && date <= today && !busy;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    const place: PlaceChoice = exact ? { placeId: exact.id } : typedPlace ? { newName: typedPlace } : null;
    const title = existing?.title ?? day?.name ?? sportName(code);
    await saveSportSession(
      db,
      user.id,
      {
        sport: code,
        date,
        durationMin: minutes ? Number.parseInt(minutes, 10) : null,
        rpe,
        distanceKm: parseDecimal(distance),
        metrics,
        notes,
        routineDayId: existing?.routine_day_id ?? day?.id ?? null,
        title: existing && canonicalSport(existing.sport ?? "") !== code ? sportName(code) : title,
      },
      place,
      existing,
    );
    toast.success(t("saved", { sport: sportName(code) }));
    close();
  }

  async function remove() {
    if (!existing) return;
    close();
    const undo = await deleteSession(db, existing);
    toast(t("deleted", { sport: sportName(existing.sport) }), { action: { label: common("undo"), onClick: () => void undo() } });
  }

  return (
    <form
      className="flex flex-col gap-6 pt-1 pb-2"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <Group title={t("sport")}>
        <GroupRow className="flex-wrap gap-2 py-3">
          {SPORT_KEYS.map((key) => {
            const on = code === key;
            return (
              <Chip key={key} className="h-9 px-3.5 text-footnote" active={on} aria-pressed={on} onClick={() => setSport(tSports(key))}>
                {tSports(key)}
              </Chip>
            );
          })}
        </GroupRow>
        <TextRow
          aria-label={t("sport")}
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          placeholder={t("sportPlaceholder")}
          maxLength={60}
          enterKeyHint="done"
        />
      </Group>

      <Group>
        <TextRow
          id="sport-date"
          label={t("date")}
          type="date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          aria-label={`${t("date")}: ${format.dateTime(dateOf(date), { weekday: "long", day: "numeric", month: "long" })}`}
        />
        <TextRow
          id="sport-minutes"
          label={t("duration")}
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder={t("minutesPlaceholder")}
          enterKeyHint="done"
        />
        <GroupRow className="gap-2 overflow-x-auto py-3 scrollbar-none">
          {QUICK_MINUTES.map((value) => (
            <Chip
              key={value}
              className="h-9 px-3.5 text-footnote"
              active={minutes === String(value)}
              aria-pressed={minutes === String(value)}
              onClick={() => setMinutes(String(value))}
            >
              {t("minutesShort", { count: value })}
            </Chip>
          ))}
        </GroupRow>
        {profile.distance ? (
          <TextRow
            id="sport-distance"
            label={`${t("distance")} (km)`}
            inputMode="decimal"
            value={distance}
            onChange={(e) => setDistance(e.target.value.slice(0, 9))}
            placeholder={t("distancePlaceholder")}
            enterKeyHint="done"
          />
        ) : null}
      </Group>

      {profile.metrics.length > 0 ? (
        <Group title={t("details")}>
          {profile.metrics.map((key: MetricKey) => (
            <GroupRow key={key} className="justify-between py-2">
              <span>{t(`metrics.${key}`)}</span>
              <Stepper
                value={metrics[key] ?? 0}
                min={0}
                max={METRIC_MAX[key]}
                onChange={(value) => setMetrics((m) => ({ ...m, [key]: value }))}
                decreaseLabel={t("metricLess", { label: t(`metrics.${key}`) })}
                increaseLabel={t("metricMore", { label: t(`metrics.${key}`) })}
              />
            </GroupRow>
          ))}
        </Group>
      ) : null}

      <Group title={placeLabel} footer={t("placeFooter")}>
        <GroupRow className="py-0">
          <MapPin aria-hidden className="size-5 shrink-0 text-tertiary-foreground" />
          <input
            aria-label={placeLabel}
            value={placeText}
            onChange={(e) => setPlaceText(e.target.value)}
            placeholder={profile.placeLabel === "spot" ? t("spotPlaceholder") : t("placePlaceholder")}
            maxLength={80}
            enterKeyHint="done"
            className="h-12 w-full min-w-0 bg-transparent text-body outline-none placeholder:text-tertiary-foreground"
          />
        </GroupRow>
        {matching.length > 0 || (typedPlace && !exact) ? (
          <GroupRow className="flex-wrap gap-2 py-3">
            {typedPlace && !exact ? (
              <Chip className="h-9 px-3.5 text-footnote" active>
                {t("newPlace", { name: typedPlace })}
              </Chip>
            ) : null}
            {matching.slice(0, SPOTS_SHOWN).map((place) => {
              const on = exact?.id === place.id;
              return (
                <Chip
                  key={place.id}
                  className="h-9 px-3.5 text-footnote"
                  active={on}
                  aria-pressed={on}
                  onClick={() => setPlaceText(on ? "" : place.name)}
                >
                  {place.name}
                </Chip>
              );
            })}
          </GroupRow>
        ) : null}
      </Group>

      <Group title={tSession("howHard")}>
        <GroupRow className="py-3">
          <RpePicker value={rpe} onChange={setRpe} />
        </GroupRow>
      </Group>

      <Group title={tSession("notes")}>
        <TextAreaRow
          aria-label={tSession("notes")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesPlaceholder")}
          maxLength={2000}
          rows={3}
        />
      </Group>

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" className="w-full" disabled={!canSave}>
          {t("save")}
        </Button>
        {existing ? (
          <>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                close();
                setNavDirection("forward");
                router.push(`/share?session=${existing.id}`);
              }}
            >
              <Share />
              {tShare("shareSession")}
            </Button>
            <Button type="button" variant="destructive" className="w-full" onClick={() => void remove()}>
              <Trash2 />
              {t("delete")}
            </Button>
          </>
        ) : null}
      </div>
    </form>
  );
}
