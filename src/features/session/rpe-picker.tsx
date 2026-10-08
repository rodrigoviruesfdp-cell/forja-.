"use client";

import { motion } from "motion/react";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";

/** Effort 1–10 in one tap (tap the chosen one again to clear it). */
export function RpePicker({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const t = useTranslations("session");
  return (
    <div role="radiogroup" aria-label={t("howHard")} className="grid w-full grid-cols-5 gap-2">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const on = value === n;
        return (
          <motion.button
            key={n}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={t("rpe", { value: n })}
            onClick={() => onChange(on ? null : n)}
            whileTap={{ scale: 0.9 }}
            className={cn(
              "numeric flex h-11 cursor-pointer items-center justify-center rounded-[12px] text-headline",
              on ? "bg-foreground text-background" : "bg-surface-2",
            )}
          >
            {n}
          </motion.button>
        );
      })}
    </div>
  );
}
