"use client";

import { CircleAlert, CloudOff, Check, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "use-intl";
import { usePendingChanges, useSyncStatus } from "@/features/user-data/user-data-context";
import { cn } from "@/lib/utils";

/** Small, always-visible answer to "is my workout saved?". Taps through to the sync details. */
export function SyncIndicator() {
  const t = useTranslations("sync");
  const status = useSyncStatus();
  const pending = usePendingChanges();

  const { label, Icon, tone } =
    status.phase === "syncing"
      ? { label: t("syncing"), Icon: RefreshCw, tone: "text-muted-foreground" }
      : status.phase === "offline"
        ? { label: t("offline"), Icon: CloudOff, tone: "text-muted-foreground" }
        : status.phase === "error"
          ? { label: t("error"), Icon: CircleAlert, tone: "text-destructive" }
          : pending > 0
            ? { label: t("pending", { count: pending }), Icon: RefreshCw, tone: "text-muted-foreground" }
            : { label: t("synced"), Icon: Check, tone: "text-done" };

  return (
    <Link
      href="/profile#sync"
      aria-label={label}
      title={label}
      className={cn("flex size-11 items-center justify-center rounded-full", tone)}
    >
      <Icon className={cn("size-5", status.phase === "syncing" && "animate-spin")} />
    </Link>
  );
}
