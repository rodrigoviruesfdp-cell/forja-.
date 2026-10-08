"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useTranslations } from "use-intl";
import { PRESS } from "@/components/motion/spring";
import { useProfile } from "@/features/profile/use-profile";
import { useUserData } from "@/features/user-data/user-data-context";
import { cn } from "@/lib/utils";
import { useSyncBadge } from "./sync-badge";

const MotionLink = motion.create(Link);

/**
 * Your monogram (like an Apple Account avatar) opens Profile. The badge on it is the
 * sync state: green check = saved, cloud = offline, red = error.
 */
export function ProfileButton() {
  const t = useTranslations("profile");
  const profile = useProfile();
  const { user } = useUserData();
  const sync = useSyncBadge();
  const source = profile?.display_name || profile?.username || user.email || "?";
  const initial = source.trim().charAt(0).toUpperCase();

  return (
    <MotionLink
      href="/profile"
      aria-label={`${t("openProfile")} · ${sync.label}`}
      title={sync.label}
      className="relative flex size-11 shrink-0 items-center justify-center"
      {...PRESS}
    >
      <span className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-linear-to-b from-[#a5abb8] to-[#858994] text-headline text-white shadow-[0_2px_10px_rgb(0_0_0/0.08)]">
        {initial}
      </span>
      <span
        aria-hidden
        className={cn(
          "absolute -right-0.5 -bottom-0.5 flex size-[18px] items-center justify-center rounded-full border-2 border-background text-white",
          sync.tone,
        )}
      >
        <sync.Icon className={cn("size-2.5", sync.spinning && "animate-spin")} strokeWidth={3.5} />
      </span>
    </MotionLink>
  );
}
