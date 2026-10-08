"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { activeSession, startSession } from "@/data/repositories/sessions";
import type { RoutineDay } from "@/domain/schemas";
import { setNavDirection } from "@/features/shell/nav-direction";
import { useUserData } from "@/features/user-data/user-data-context";

/** Starts a session (a routine day or a free one) and opens it. One session at a time. */
export function useStartSession(): (day: RoutineDay | null, title: string) => Promise<void> {
  const t = useTranslations("session");
  const router = useRouter();
  const { db, user } = useUserData();

  function open(id: string) {
    setNavDirection("forward");
    router.push(`/session?id=${id}`);
  }

  return async (day, title) => {
    const running = await activeSession(db);
    if (running) {
      toast(t("alreadyRunning"), { action: { label: t("continue"), onClick: () => open(running.id) } });
      return;
    }
    const session = await startSession(db, user.id, day, title);
    open(session.id);
  };
}
