"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { TextAreaRow } from "@/components/ui/form-rows";
import { Group, GroupRow } from "@/components/ui/group";
import { Spinner } from "@/components/ui/spinner";
import { cleanText } from "@/data/repositories/profiles";
import { finishSession, sessionSummary } from "@/data/repositories/sessions";
import type { Session } from "@/domain/schemas";
import { useUserData } from "@/features/user-data/user-data-context";
import { RpePicker } from "./rpe-picker";
import { SessionStats } from "./session-stats";

interface FinishSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  /** Work sets still to do across the session (they are not saved). */
  pending: number;
  names: (exerciseId: string) => string;
  onFinished: () => void;
}

/**
 * "Terminar entreno": the summary of what you did, how hard it was (one tap, optional)
 * and notes. Saving closes the session; until then you can go back and keep training.
 */
export function FinishSheet({ open, onOpenChange, session, pending, names, onFinished }: FinishSheetProps) {
  const t = useTranslations("session");
  const common = useTranslations("common");
  const { db } = useUserData();
  const [rpe, setRpe] = useState<number | null>(session.rpe);
  const [notes, setNotes] = useState(session.notes ?? "");
  const [busy, setBusy] = useState(false);
  const summary = useLiveQuery(() => (open ? sessionSummary(db, session) : undefined), [db, session, open]);

  async function save() {
    if (busy) return;
    setBusy(true);
    await finishSession(db, session, { rpe, notes: cleanText(notes, 2000) });
    setBusy(false);
    onOpenChange(false);
    onFinished();
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={t("finishTitle")}
      closeLabel={common("cancel")}
      footer={
        <Button size="lg" className="w-full" disabled={busy || !summary} onClick={() => void save()}>
          {t("saveSession")}
        </Button>
      }
    >
      <div className="flex flex-col gap-5 pt-1 pb-2">
        {summary ? (
          <>
            {pending > 0 || summary.workSets === 0 ? (
              <p className="rounded-[14px] bg-surface-2 px-3.5 py-3 text-subhead text-muted-foreground">
                {summary.workSets === 0 ? t("nothingLogged") : t("pending", { count: pending })}
              </p>
            ) : null}
            <SessionStats summary={summary} names={names} />
          </>
        ) : (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}

        <Group title={t("howHard")} footer={t("howHardFooter")}>
          <GroupRow className="py-3">
            <RpePicker value={rpe} onChange={setRpe} />
          </GroupRow>
        </Group>

        <Group title={t("notes")}>
          <TextAreaRow
            aria-label={t("notes")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("notesPlaceholder")}
            maxLength={2000}
            rows={3}
          />
        </Group>
      </div>
    </Drawer>
  );
}
