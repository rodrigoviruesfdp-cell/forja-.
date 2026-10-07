"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useFormatter, useNow, useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { usePendingChanges, useSyncStatus, useUserData } from "@/features/user-data/user-data-context";
import { Section } from "./section";

export function SyncSection() {
  const t = useTranslations("profile");
  const tSync = useTranslations("sync");
  const format = useFormatter();
  const now = useNow({ updateInterval: 30_000 });
  const { runner, engine, db } = useUserData();
  const status = useSyncStatus();
  const pending = usePendingChanges();
  const rejected = useLiveQuery(() => db.outbox.filter((e) => Boolean(e.error)).toArray(), [db], []);

  const statusText =
    status.phase === "syncing"
      ? tSync("syncing")
      : status.phase === "offline"
        ? tSync("offline")
        : status.phase === "error"
          ? `${tSync("error")}: ${status.error ?? ""}`
          : pending > 0
            ? tSync("pending", { count: pending })
            : tSync("synced");

  // One line per row, even if it was edited several times.
  const rejectedRows = [...new Map(rejected.map((e) => [`${e.table}:${e.row_id}`, e])).values()];

  return (
    <Section id="sync" title={t("syncSection")}>
      <div className="flex flex-col gap-1">
        <p className="font-medium">{statusText}</p>
        <p className="text-sm text-muted-foreground">
          {status.lastSyncedAt
            ? t("lastSynced", { time: format.relativeTime(new Date(status.lastSyncedAt), now) })
            : t("neverSynced")}
        </p>
      </div>
      <Button
        variant="secondary"
        className="self-start"
        disabled={status.phase === "syncing"}
        onClick={() => void runner.syncNow()}
      >
        {t("syncNow")}
      </Button>
      {rejectedRows.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-4">
          <p className="font-medium text-destructive">{t("rejectedTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("rejectedBody")}</p>
          <ul className="flex flex-col gap-2">
            {rejectedRows.map((entry) => (
              <li key={`${entry.table}:${entry.row_id}`} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm">
                  {entry.table}: {entry.error}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    // Needs the server copy; if offline nothing changes and it can be retried.
                    void engine.discardRejected(entry.table, entry.row_id).catch(() => undefined)
                  }
                >
                  {t("discard")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  );
}
