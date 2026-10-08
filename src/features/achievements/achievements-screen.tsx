"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { PRESS } from "@/components/motion/spring";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Spinner } from "@/components/ui/spinner";
import { featuredCount } from "@/domain/achievements/evaluate";
import { PageHeader } from "@/features/shell/page-header";
import { AchievementViewer } from "./achievement-viewer";
import { Badge, toneColor } from "./badge";
import { type AchievementEntry, useAchievementText, useAchievements } from "./use-achievements";

/** Earned first (newest first), then the ones on the way (closest first), then the secrets. */
function sections(entries: AchievementEntry[]) {
  const earned = entries
    .filter((entry) => entry.row)
    .sort((a, b) => (b.row?.unlocked_at ?? "").localeCompare(a.row?.unlocked_at ?? ""));
  const inProgress = entries
    .filter((entry) => !entry.row && !entry.hidden)
    .sort((a, b) => b.progress.fraction - a.progress.fraction);
  const secrets = entries.filter((entry) => entry.hidden);
  return { earned, inProgress, secrets };
}

/** /achievements (?key=… opens one): every achievement, earned or not. */
export function AchievementsScreen() {
  const t = useTranslations("achievements");
  const data = useAchievements();
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);

  if (!data) {
    return (
      <>
        <PageHeader title={t("title")} backFallback="/profile" />
        <Spinner className="mx-auto mt-10" />
      </>
    );
  }

  const { earned, inProgress, secrets } = sections(data.entries);
  const ordered = [...earned, ...inProgress, ...secrets];
  const requested = params.get("key");
  const fromLink = requested ? ordered.findIndex((entry) => entry.achievement.key === requested) : -1;
  const index = open ?? (fromLink >= 0 ? fromLink : null);

  const close = () => {
    setOpen(null);
    // Forget ?key= so the viewer does not come back.
    if (requested) router.replace("/achievements");
  };

  // Each section opens the viewer at its place in `ordered`.
  const group = (title: string, items: AchievementEntry[], start: number) => {
    if (items.length === 0) return null;
    return (
      <StaggerItem>
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-title-3">{title}</h2>
          <div className="grid grid-cols-3 gap-x-3 gap-y-5">
            {items.map((entry, i) => (
              <Cell key={entry.achievement.key} entry={entry} onOpen={() => setOpen(start + i)} />
            ))}
          </div>
        </section>
      </StaggerItem>
    );
  };

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("summary", { earned: earned.length, total: data.entries.length })}
        backFallback="/profile"
      />
      <Stagger className="flex flex-col gap-8 px-4 pb-8">
        {group(t("earned"), earned, 0)}
        {group(t("inProgress"), inProgress, earned.length)}
        {group(t("secrets"), secrets, earned.length + inProgress.length)}
      </Stagger>
      <AnimatePresence>
        {index !== null ? (
          <AchievementViewer
            entries={ordered}
            index={Math.min(index, ordered.length - 1)}
            onIndexChange={setOpen}
            onClose={close}
            featuredCount={featuredCount(data.rows)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Cell({ entry, onOpen }: { entry: AchievementEntry; onOpen: () => void }) {
  const t = useTranslations("achievements");
  const text = useAchievementText();
  const { achievement, progress, row, hidden } = entry;
  return (
    <motion.button type="button" onClick={onOpen} className="flex cursor-pointer flex-col items-center gap-2 text-center" {...PRESS}>
      <span className="relative">
        <Badge icon={achievement.icon} tone={entry.tone} secret={hidden} className="size-[88px]" />
        {entry.unseen.length > 0 ? (
          <span className="absolute -top-1 -right-1 rounded-full bg-pr px-1.5 py-0.5 text-caption-2 font-semibold text-white">
            {t("new")}
          </span>
        ) : null}
      </span>
      <span className="line-clamp-2 text-footnote font-semibold">{text.name(entry)}</span>
      {row ? (
        <span className="-mt-1.5 text-caption text-muted-foreground">
          {achievement.tiers.length > 1 ? t("level", { tier: progress.tier }) : text.goal(achievement, achievement.tiers[0] ?? 1)}
        </span>
      ) : hidden ? null : (
        <span className="-mt-1 flex w-full flex-col items-center gap-1">
          <span className="h-1 w-16 overflow-hidden rounded-full bg-surface-2">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.max(progress.fraction, 0.04) * 100}%`, background: toneColor("gold") }}
            />
          </span>
          <span className="font-rounded text-caption text-muted-foreground tabular-nums">
            {progress.next !== null ? text.fraction(achievement, progress.value, progress.next) : null}
          </span>
        </span>
      )}
    </motion.button>
  );
}
