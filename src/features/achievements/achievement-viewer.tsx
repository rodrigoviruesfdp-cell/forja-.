"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Pin, PinOff, Share, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useFormatter, useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { markAchievementsSeen, toggleFeaturedAchievement } from "@/data/repositories/achievements";
import { MAX_FEATURED } from "@/domain/achievements/catalog";
import { dateOf } from "@/domain/dates";
import { setNavDirection } from "@/features/shell/nav-direction";
import { useSessionTitle } from "@/features/sports/use-sport-format";
import { useUserData } from "@/features/user-data/user-data-context";
import { cn } from "@/lib/utils";
import { Badge, toneColor } from "./badge";
import { type AchievementEntry, useAchievementText } from "./use-achievements";

/** "Surf · Zurriola · 8 oct": the session that earned it. */
function useSessionLine(sessionId: string | null): string | null {
  const { db } = useUserData();
  const title = useSessionTitle();
  const format = useFormatter();
  const data = useLiveQuery(async () => {
    if (!sessionId) return null;
    const session = await db.sessions.get(sessionId);
    if (!session || session.deleted_at) return null;
    const place = session.place_id ? await db.places.get(session.place_id) : undefined;
    return { session, place: place?.name ?? null };
  }, [db, sessionId]);
  if (!data) return null;
  return [title(data.session), data.place, format.dateTime(dateOf(data.session.date), { day: "numeric", month: "short" })]
    .filter(Boolean)
    .join(" · ");
}

interface AchievementViewerProps {
  entries: AchievementEntry[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** How many are highlighted now (to stop at the maximum). */
  featuredCount: number;
}

/**
 * An achievement full screen, like a story: tap the sides or swipe to move between them,
 * swipe down or ✕ to close. Opening one marks it as seen.
 */
export function AchievementViewer({ entries, index, onIndexChange, onClose, featuredCount }: AchievementViewerProps) {
  const t = useTranslations("achievements");
  const text = useAchievementText();
  const format = useFormatter();
  const router = useRouter();
  const { db } = useUserData();
  const entry = entries[index];
  const sessionLine = useSessionLine(entry?.row?.session_id ?? null);

  const go = (delta: number) => {
    const next = index + delta;
    if (next < 0) return;
    if (next >= entries.length) onClose();
    else onIndexChange(next);
  };

  const unseenIds = (entry?.unseen ?? []).map((row) => row.id).join(",");
  const markSeen = useEffectEvent(() => {
    if (entry && entry.unseen.length > 0) void markAchievementsSeen(db, entry.unseen);
  });
  useEffect(() => {
    if (unseenIds) markSeen();
  }, [unseenIds]);

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") onClose();
    if (event.key === "ArrowRight") go(1);
    if (event.key === "ArrowLeft") go(-1);
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  if (!entry || typeof document === "undefined") return null;
  const { achievement, progress, row, hidden, featured } = entry;
  const name = text.name(entry);
  const earned = row !== null;

  async function toggleFeatured() {
    if (!featured && featuredCount >= MAX_FEATURED) {
      toast(t("featureFull", { max: MAX_FEATURED }));
      return;
    }
    await toggleFeaturedAchievement(db, achievement.key);
  }

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal
      aria-label={name}
      className="fixed inset-0 z-[60] mx-auto flex max-w-lg flex-col bg-black text-white"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
    >
      <div className="px-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex gap-1" aria-hidden>
          {entries.map((item, i) => (
            <span key={item.achievement.key} className={cn("h-[3px] flex-1 rounded-full", i <= index ? "bg-white" : "bg-white/25")} />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between pl-1">
          <span className="text-footnote text-white/60">{t("position", { index: index + 1, total: entries.length })}</span>
          <button
            type="button"
            aria-label={t("close")}
            onClick={onClose}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/12"
          >
            <X className="size-5" strokeWidth={2.4} />
          </button>
        </div>
      </div>

      <motion.div
        className="relative flex flex-1 touch-none flex-col items-center justify-center px-8 text-center select-none"
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.5}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 && Math.abs(info.offset.y) > Math.abs(info.offset.x)) onClose();
          else if (info.offset.x < -60) go(1);
          else if (info.offset.x > 60) go(-1);
        }}
        onTap={(_, info) => {
          const x = info.point.x / window.innerWidth;
          if (x < 0.3) go(-1);
          else if (x > 0.7) go(1);
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={achievement.key}
            className="flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="relative">
              {earned ? (
                <span
                  aria-hidden
                  className="absolute inset-4 rounded-full opacity-50 blur-3xl"
                  style={{ background: toneColor(entry.tone) }}
                />
              ) : null}
              <Badge icon={achievement.icon} tone={entry.tone} secret={hidden} className="relative size-48" />
            </div>
            <h2 className="mt-6 text-title-1">{name}</h2>
            {earned && text.level(entry) ? <p className="mt-1 text-headline text-white/80">{text.level(entry)}</p> : null}
            <p className="mt-2 max-w-xs text-body text-white/60">{text.description(entry)}</p>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="flex flex-col gap-3 px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
        {hidden ? null : (
          <div className="flex flex-col gap-3 rounded-[22px] bg-white/8 p-4 text-left">
            {earned ? (
              <div>
                <p className="text-subhead font-semibold">
                  {t("unlockedOn", {
                    date: format.dateTime(new Date(row.unlocked_at), { day: "numeric", month: "long", year: "numeric" }),
                  })}
                </p>
                {sessionLine ? <p className="text-footnote text-white/60">{t("with", { session: sessionLine })}</p> : null}
              </div>
            ) : (
              <p className="text-subhead font-semibold">{t("notYet")}</p>
            )}
            {progress.next === null ? (
              <p className="text-footnote text-white/60">{t("maxLevel")}</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-footnote">
                  <span className="text-white/60">
                    {achievement.tiers.length > 1 ? `${t("nextLevel", { tier: progress.tier + 1 })}: ` : ""}
                    {text.goal(achievement, progress.next)}
                  </span>
                  <span className="shrink-0 font-rounded font-semibold tabular-nums">
                    {text.fraction(achievement, progress.value, progress.next)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: toneColor(earned ? entry.tone : "gold"), originX: 0 }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: Math.max(progress.fraction, 0.02) }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        {earned ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              className="bg-white/14 text-white"
              onClick={() => {
                setNavDirection("forward");
                router.push(`/share?achievement=${achievement.key}`);
              }}
            >
              <Share />
              {t("share")}
            </Button>
            <Button
              variant="secondary"
              aria-label={featured ? t("unfeature") : t("feature")}
              aria-pressed={featured}
              className={cn("px-4", featured ? "bg-white text-black" : "bg-white/14 text-white")}
              onClick={() => void toggleFeatured()}
            >
              {featured ? <PinOff /> : <Pin />}
              {featured ? t("featuredShort") : t("featureShort")}
            </Button>
          </div>
        ) : null}
      </div>
    </motion.div>,
    document.body,
  );
}
