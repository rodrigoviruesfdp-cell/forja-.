"use client";

import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { IDLE_MINUTES } from "@/domain/sessions/session";
import type { Session } from "@/domain/schemas";
import { clockText, useTicker } from "./use-ticker";

/**
 * Takes the tab bar's place during a session: how long you have been training, the rest
 * since your last set, and "Finish" within thumb reach.
 */
export function SessionBar({ session, lastSetAt, onFinish }: { session: Session; lastSetAt: string | null; onFinish: () => void }) {
  const t = useTranslations("session");
  const now = useTicker(1000);
  const started = Date.parse(session.started_at ?? session.created_at);
  const rest = lastSetAt ? now - Date.parse(lastSetAt) : null;
  const showRest = rest !== null && rest < IDLE_MINUTES * 60_000;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="material pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-full border p-1.5 pl-6 shadow-float">
        <div className="flex min-w-0 flex-1 items-baseline gap-4" aria-live="off">
          <p className="flex flex-col">
            <span className="tracking-caption text-caption-2 text-muted-foreground uppercase">{t("elapsed")}</span>
            <span className="numeric text-headline">{clockText(now - started)}</span>
          </p>
          {showRest ? (
            <p className="flex flex-col">
              <span className="tracking-caption text-caption-2 text-muted-foreground uppercase">{t("rest")}</span>
              <span className="numeric text-headline text-planned">{clockText(rest)}</span>
            </p>
          ) : null}
        </div>
        <Button size="lg" className="h-[52px] px-6" onClick={onFinish}>
          {t("finish")}
        </Button>
      </div>
    </div>
  );
}
