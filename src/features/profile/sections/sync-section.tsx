"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useFormatter, useNow, useTranslations } from "use-intl";
import { Group, GroupRow, GroupRowButton } from "@/components/ui/group";
import { useSyncBadge } from "@/features/shell/sync-badge";
import { useSyncStatus, useUserData } from "@/features/user-data/user-data-context";
import { cn } from "@/lib/utils";

export function SyncSection() {
  const t = useTranslations("profile");
  const tSync = useTranslations("sync");
  const format = useFormatter();
  const now = useNow({ updateInterval: 30_000 });
  const { runner, engine, db } = useUserData();
  const status = useSyncStatus();
  const badge = useSyncBadge();
  const rejected = useLiveQuery(() => db.outbox.filter((e) => Boolean(e.error)).toArray(), [db], []);

  // One line per row, even if it was edited several times.
  const rejectedRows = [...new Map(rejected.map((e) => [`${e.table}:${e.row_id}`, e])).values()];

  return (
    <>
      <Group
        id="sync"
        title={t("syncSection")}
        footer={
          status.lastSyncedAt
            ? t("lastSynced", { time: format.relativeTime(new Date(status.lastSyncedAt), now) })
            : t("neverSynced")
        }
      >
        <GroupRow>
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-[8px] text-white", badge.tone)}>
            <badge.Icon className={cn("size-4", badge.spinning && "animate-spin")} strokeWidth={2.6} />
          </span>
          <span className="min-w-0 flex-1">
            {status.phase === "error" ? `${tSync("error")}: ${status.error ?? ""}` : badge.label}
          </span>
        </GroupRow>
        <GroupRowButton tone="action" disabled={status.phase === "syncing"} onClick={() => void runner.syncNow()}>
          {t("syncNow")}
        </GroupRowButton>
      </Group>

      {rejectedRows.length > 0 ? (
        <Group title={t("rejectedTitle")} footer={t("rejectedBody")}>
          {rejectedRows.map((entry) => (
            <GroupRow key={`${entry.table}:${entry.row_id}`} className="justify-between">
              <span className="min-w-0 truncate text-subhead text-destructive">
                {entry.table}: {entry.error}
              </span>
              <button
                type="button"
                className="shrink-0 cursor-pointer text-subhead font-medium text-planned"
                onClick={() =>
                  // Needs the server copy; if offline nothing changes and it can be retried.
                  void engine.discardRejected(entry.table, entry.row_id).catch(() => undefined)
                }
              >
                {t("discard")}
              </button>
            </GroupRow>
          ))}
        </Group>
      ) : null}
    </>
  );
}
