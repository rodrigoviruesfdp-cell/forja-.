"use client";

import { CalendarDays, ChartLine, Dumbbell, ListChecks, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/today", key: "today", Icon: Dumbbell },
  { href: "/calendar", key: "calendar", Icon: CalendarDays },
  { href: "/routines", key: "routines", Icon: ListChecks },
  { href: "/progress", key: "progress", Icon: ChartLine },
  { href: "/profile", key: "profile", Icon: UserRound },
] as const;

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-safe backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <ul className="mx-auto flex max-w-lg">
        {ITEMS.map(({ href, key, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-0 h-[3px] w-8 rounded-b-full bg-primary transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon className="size-6" strokeWidth={active ? 2.4 : 1.8} />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
