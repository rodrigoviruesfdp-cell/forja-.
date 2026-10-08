"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFormatter, useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { checkAchievements, markAchievementsSeen } from "@/data/repositories/achievements";
import { type Achievement, type AchievementKey, achievementByKey, tierTone } from "@/domain/achievements/catalog";
import type { UserAchievement } from "@/domain/schemas";
import { setNavDirection } from "@/features/shell/nav-direction";
import { useSyncStatus, useUserData } from "@/features/user-data/user-data-context";
import { Badge, toneColor } from "./badge";
import { useAchievementText } from "./use-achievements";

interface AchievementsContext {
  /** Looks for new unlocks (after finishing or saving a session) and celebrates them. */
  check: () => Promise<void>;
}

const Context = createContext<AchievementsContext | null>(null);

export function useAchievementCheck(): () => Promise<void> {
  const value = useContext(Context);
  if (!value) throw new Error("useAchievementCheck must be used inside <AchievementsProvider>");
  return value.check;
}

/**
 * Checks achievements when a session is finished or saved, and once in the background when
 * the app opens (after the first sync, so unlocks from another phone arrive first). New ones
 * get a full-screen celebration, one after another.
 */
export function AchievementsProvider({ children }: { children: ReactNode }) {
  const { db, user, runner } = useUserData();
  const status = useSyncStatus();
  // The unlocks being celebrated, and which one is on screen.
  const [batch, setBatch] = useState<{ rows: UserAchievement[]; index: number }>({ rows: [], index: 0 });

  const check = useCallback(async () => {
    try {
      const fresh = await checkAchievements(db, user.id);
      if (fresh.length > 0) setBatch((current) => ({ ...current, rows: [...current.rows, ...fresh] }));
    } catch (error) {
      // Achievements never get in the way of saving a session.
      console.warn("Achievements check failed", error);
    }
  }, [db, user.id]);

  // Once per app launch, after a sync made in this launch.
  const checkedOnLaunch = useRef(false);
  const syncedThisLaunch = status.phase === "idle" && !!status.lastSyncedAt && status.lastSyncedAt >= runner.startedAt;
  useEffect(() => {
    if (checkedOnLaunch.current || !syncedThisLaunch) return;
    checkedOnLaunch.current = true;
    void check();
  }, [syncedThisLaunch, check]);

  const next = useCallback(() => {
    const current = batch.rows[batch.index];
    if (current) void markAchievementsSeen(db, [current]);
    setBatch((b) => (b.index + 1 >= b.rows.length ? { rows: [], index: 0 } : { ...b, index: b.index + 1 }));
  }, [db, batch]);

  const closeAll = useCallback(() => {
    void markAchievementsSeen(db, batch.rows.slice(batch.index));
    setBatch({ rows: [], index: 0 });
  }, [db, batch]);

  const value = useMemo(() => ({ check }), [check]);
  return (
    <Context.Provider value={value}>
      {children}
      <Celebration rows={batch.rows} index={batch.index} onNext={next} onCloseAll={closeAll} />
    </Context.Provider>
  );
}

/** Full-screen "Achievement unlocked!": the medal springs in with a glow. */
function Celebration({
  rows,
  index,
  onNext,
  onCloseAll,
}: {
  rows: UserAchievement[];
  index: number;
  onNext: () => void;
  onCloseAll: () => void;
}) {
  const t = useTranslations("achievements");
  const text = useAchievementText();
  const format = useFormatter();
  const router = useRouter();

  const current = rows[index];
  const achievement: Achievement | undefined = current ? achievementByKey(current.achievement_key) : undefined;

  // Unknown (from a newer version on another phone): nothing to show.
  useEffect(() => {
    if (current && !achievement) onNext();
  }, [current, achievement, onNext]);

  useEffect(() => {
    if (!current) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, onCloseAll]);

  if (typeof document === "undefined") return null;
  const tone = current && achievement ? tierTone(achievement, current.tier) : "gold";
  const threshold = current && achievement ? (achievement.tiers[current.tier - 1] ?? 0) : 0;

  return createPortal(
    <AnimatePresence>
      {current && achievement ? (
        <motion.div
          key="celebration"
          role="dialog"
          aria-modal
          aria-labelledby="achievement-unlocked-title"
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/80 px-8 text-center text-white backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              className="flex w-full max-w-sm flex-col items-center"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <div className="relative flex size-60 items-center justify-center">
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full blur-3xl"
                  style={{ background: toneColor(tone) }}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 0.55, scale: 1 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
                <motion.span
                  aria-hidden
                  className="absolute inset-6 rounded-full border-2"
                  style={{ borderColor: toneColor(tone) }}
                  initial={{ opacity: 0.8, scale: 0.7 }}
                  animate={{ opacity: 0, scale: 1.5 }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: 0.25 }}
                />
                <motion.div
                  initial={{ scale: 0.3, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14, mass: 0.9 }}
                >
                  <Badge icon={achievement.icon} tone={tone} className="size-44 drop-shadow-[0_12px_30px_rgb(0_0_0/0.5)]" />
                </motion.div>
              </div>
              <p className="mt-6 text-footnote font-semibold tracking-wide text-primary uppercase">{t("unlocked")}</p>
              <h2 id="achievement-unlocked-title" className="mt-1 text-title-1">
                {text.name({ achievement, hidden: false })}
              </h2>
              <p className="mt-1 text-body text-white/75">
                {[
                  achievement.tiers.length > 1 ? t("level", { tier: current.tier }) : null,
                  text.goal(achievement, threshold),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-1 text-footnote text-white/50">
                {t("unlockedOn", { date: format.dateTime(new Date(current.unlocked_at), { day: "numeric", month: "long" }) })}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex w-full max-w-sm flex-col gap-2">
            <Button size="lg" className="w-full" onClick={onNext} autoFocus>
              {index + 1 < rows.length ? t("next") : t("continue")}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-white hover:bg-white/10"
              onClick={() => {
                onCloseAll();
                setNavDirection("forward");
                router.push(`/achievements?key=${(current.achievement_key as AchievementKey)}`);
              }}
            >
              {t("see")}
            </Button>
            {rows.length > 1 ? (
              <p className="pt-1 text-footnote text-white/50">{t("position", { index: index + 1, total: rows.length })}</p>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
