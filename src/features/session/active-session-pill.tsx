"use client";

import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "use-intl";
import { PRESS_SOFT } from "@/components/motion/spring";
import { useActiveSession } from "./use-session";
import { clockText, useTicker } from "./use-ticker";

const MotionLink = motion.create(Link);

function useVisibleSession() {
  const pathname = usePathname();
  const session = useActiveSession();
  return !session || pathname === "/session" || pathname.startsWith("/session/") ? null : session;
}

/**
 * While a session runs and you look elsewhere: a pill above the tab bar that takes you back.
 * Lives outside the page wrapper (like the tab bar), so sheets never move it.
 */
export function ActiveSessionPill() {
  const session = useVisibleSession();
  if (!session) return null;
  return <Pill id={session.id} startedAt={session.started_at ?? session.created_at} title={session.title} />;
}

/** Room at the end of the page so the pill never covers the last row. */
export function ActiveSessionSpacer() {
  return useVisibleSession() ? <div aria-hidden className="h-14" /> : null;
}

function Pill({ id, startedAt, title }: { id: string; startedAt: string; title: string | null }) {
  const t = useTranslations("session");
  const now = useTicker(1000);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(64px+max(env(safe-area-inset-bottom),12px)+8px)] z-40 px-3">
      <MotionLink
        href={`/session?id=${id}`}
        data-nav="forward"
        aria-label={`${t("backToSession")}: ${title ?? t("title")}`}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        {...PRESS_SOFT}
        className="material pointer-events-auto mx-auto flex h-12 max-w-md items-center gap-3 rounded-full border px-4 shadow-float"
      >
        <span aria-hidden className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-done opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-done" />
        </span>
        <span className="min-w-0 flex-1 truncate text-subhead font-semibold">
          {t("inProgress")}
          {title ? <span className="font-normal text-muted-foreground"> · {title}</span> : null}
        </span>
        <span className="numeric text-subhead">{clockText(now - Date.parse(startedAt))}</span>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-tertiary-foreground" />
      </MotionLink>
    </div>
  );
}
