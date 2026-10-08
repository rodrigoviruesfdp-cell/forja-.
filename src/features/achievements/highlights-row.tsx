"use client";

import { LayoutGrid } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { useTranslations } from "use-intl";
import { PRESS } from "@/components/motion/spring";
import { featuredCount, highlights } from "@/domain/achievements/evaluate";
import { cn } from "@/lib/utils";
import { AchievementViewer } from "./achievement-viewer";
import { Badge } from "./badge";
import { type AchievementEntry, useAchievementText, useAchievements } from "./use-achievements";

/** Instagram's "story ring": colour for something new, grey once seen. */
function Ring({ unseen, children }: { unseen: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "block rounded-full p-[2.5px]",
        unseen ? "bg-[conic-gradient(from_200deg,var(--primary),var(--streak),var(--pr),var(--primary))]" : "bg-separator",
      )}
    >
      <span className="block rounded-full bg-background p-[3px]">{children}</span>
    </span>
  );
}

/**
 * The highlights under the profile: the achievements you chose (or your latest ones) as
 * circles, like Instagram's. Tapping one opens it full screen; the last circle opens them all.
 */
export function HighlightsRow() {
  const t = useTranslations("achievements");
  const text = useAchievementText();
  const data = useAchievements();
  const [open, setOpen] = useState<number | null>(null);
  if (!data) return <div className="h-[118px]" />;

  const byKey = new Map(data.entries.map((entry) => [entry.achievement.key, entry]));
  const shown = highlights(data.rows)
    .map((key) => byKey.get(key))
    .filter((entry): entry is AchievementEntry => !!entry);

  return (
    <section aria-label={t("highlights")}>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shown.map((entry, index) => (
          <motion.button
            key={entry.achievement.key}
            type="button"
            onClick={() => setOpen(index)}
            className="flex w-[76px] shrink-0 cursor-pointer flex-col items-center gap-1.5 self-start"
            {...PRESS}
          >
            <Ring unseen={entry.unseen.length > 0}>
              <Badge icon={entry.achievement.icon} tone={entry.tone} className="size-[62px]" />
            </Ring>
            <span className="line-clamp-2 w-full text-center text-caption leading-tight">{text.name(entry)}</span>
          </motion.button>
        ))}
        <Link href="/achievements" data-nav="forward" className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 self-start">
          <Ring unseen={false}>
            <span className="flex size-[62px] items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
              <LayoutGrid className="size-6" strokeWidth={2} />
            </span>
          </Ring>
          <span className="line-clamp-2 w-full text-center text-caption leading-tight">{t("all")}</span>
        </Link>
        {shown.length === 0 ? (
          <p className="flex max-w-56 items-center text-footnote text-muted-foreground">{t("empty")}</p>
        ) : null}
      </div>
      <AnimatePresence>
        {open !== null ? (
          <AchievementViewer
            entries={shown}
            index={Math.min(open, shown.length - 1)}
            onIndexChange={setOpen}
            onClose={() => setOpen(null)}
            featuredCount={featuredCount(data.rows)}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}
