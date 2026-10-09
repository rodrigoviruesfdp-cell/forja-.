"use client";

import { FlaskConical } from "lucide-react";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useTranslations } from "use-intl";
import { PRESS } from "@/components/motion/spring";
import { useVisibleSession } from "@/features/session/active-session-pill";
import { useUserData } from "@/features/user-data/user-data-context";
import { cn } from "@/lib/utils";
import { useDemo } from "./use-demo";

/** Screens with their own bottom bar and no tab bar (the pill would sit on top of it). */
const FULL_SCREEN = ["/session", "/share"];

function useVisiblePill(): boolean {
  const { demo } = useUserData();
  const pathname = usePathname();
  return demo && !FULL_SCREEN.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * While you look at the sample data: a capsule above the tab bar (and above the session pill,
 * if one shows) that says so and takes you back to your data.
 */
export function DemoPill() {
  const t = useTranslations("demo");
  const visible = useVisiblePill();
  const session = useVisibleSession();
  const { leave } = useDemo();
  if (!visible) return null;
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3",
        session
          ? "bottom-[calc(64px+max(env(safe-area-inset-bottom),12px)+64px)]"
          : "bottom-[calc(64px+max(env(safe-area-inset-bottom),12px)+8px)]",
      )}
    >
      <motion.button
        type="button"
        aria-label={t("pillLabel")}
        onClick={() => void leave()}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        {...PRESS}
        className="material pointer-events-auto flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-subhead font-semibold shadow-float"
      >
        <FlaskConical aria-hidden className="size-4 text-planned" strokeWidth={2.4} />
        {t("pill")}
        <span aria-hidden className="text-planned">
          {t("leave")}
        </span>
      </motion.button>
    </div>
  );
}

/** Room at the end of the page so the capsule never covers the last row. */
export function DemoSpacer() {
  return useVisiblePill() ? <div aria-hidden className="h-14" /> : null;
}
