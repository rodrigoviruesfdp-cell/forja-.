"use client";

import type { ReactNode } from "react";
import { useTranslations } from "use-intl";
import { Spinner } from "@/components/ui/spinner";
import { useSyncStatus } from "@/features/user-data/user-data-context";
import { Wordmark } from "./wordmark";

/** Only the very first time on a device: wait for the initial download. */
export function InitialSyncGate({ children }: { children: ReactNode }) {
  const t = useTranslations("initialSync");
  const status = useSyncStatus();
  if (status.initialSyncDone) return children;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6">
      <Wordmark />
      <div className="flex items-center gap-3">
        <Spinner className="size-6" />
        <h1 className="text-title-2">{t("title")}</h1>
      </div>
      <p className="text-muted-foreground">{status.phase === "offline" ? t("offline") : t("body")}</p>
      {status.phase === "error" && status.error ? <p className="text-footnote text-destructive">{status.error}</p> : null}
    </main>
  );
}
