"use client";

import { Check, CircleAlert, CloudOff, type LucideIcon, RefreshCw } from "lucide-react";
import { useTranslations } from "use-intl";
import { usePendingChanges, useSyncStatus } from "@/features/user-data/user-data-context";

export interface SyncBadge {
  label: string;
  Icon: LucideIcon;
  /** Badge fill. */
  tone: string;
  spinning: boolean;
}

/** Always-visible answer to "is my workout saved?", shown as a badge on your avatar. */
export function useSyncBadge(): SyncBadge {
  const t = useTranslations("sync");
  const status = useSyncStatus();
  const pending = usePendingChanges();

  if (status.phase === "syncing") return { label: t("syncing"), Icon: RefreshCw, tone: "bg-tertiary-foreground", spinning: true };
  if (status.phase === "offline") return { label: t("offline"), Icon: CloudOff, tone: "bg-tertiary-foreground", spinning: false };
  if (status.phase === "error") return { label: t("error"), Icon: CircleAlert, tone: "bg-destructive", spinning: false };
  if (pending > 0) return { label: t("pending", { count: pending }), Icon: RefreshCw, tone: "bg-tertiary-foreground", spinning: false };
  return { label: t("synced"), Icon: Check, tone: "bg-done", spinning: false };
}
