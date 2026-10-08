"use client";

import { CalendarDays, ChartLine, Dumbbell, ListChecks, UsersRound } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/today", key: "today", Icon: Dumbbell, also: [] },
  { href: "/calendar", key: "calendar", Icon: CalendarDays, also: [] },
  { href: "/routines", key: "routines", Icon: ListChecks, also: ["/exercises"] },
  { href: "/progress", key: "progress", Icon: ChartLine, also: [] },
  { href: "/community", key: "community", Icon: UsersRound, also: [] },
] as const;

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Floating capsule tab bar (iOS 26 style): translucent material, hairline rim, soft shadow.
 * The selected tab sits on a lens that springs from tab to tab. Bar: 32px radius with 6px
 * padding, so the 52px items use 26px (concentric capsules).
 */
export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  // During a session its own bar (clock + Finish) takes this place; sharing is full screen.
  if (matches(pathname, "/session") || matches(pathname, "/share")) return null;

  return (
    <nav
      aria-label={t("label")}
      data-nav-tabs=""
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),12px)]"
    >
      <ul className="material pointer-events-auto mx-auto flex max-w-md rounded-full border p-1.5 shadow-float">
        {ITEMS.map(({ href, key, Icon, also }) => {
          const active = [href, ...also].some((prefix) => matches(pathname, prefix));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-full text-caption-2 font-semibold",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {active ? (
                  <motion.span layoutId="tab-lens" aria-hidden className="absolute inset-0 rounded-full bg-surface-2" />
                ) : null}
                <motion.span className="relative" whileTap={{ scale: 0.86 }}>
                  <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.9} />
                </motion.span>
                <span className="relative">{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
