"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { TextRow } from "@/components/ui/form-rows";
import { Group, GroupRow } from "@/components/ui/group";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { createRoutine } from "@/data/repositories/routines";
import type { ScheduleType } from "@/domain/routines/builder";
import type { Profile } from "@/domain/schemas";
import { setNavDirection } from "@/features/shell/nav-direction";
import { useUserData } from "@/features/user-data/user-data-context";

/** Name + weekly or rotation; the days are added in the editor that opens next. */
export function NewRoutineSheet({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
}) {
  const t = useTranslations("routines");
  const common = useTranslations("common");
  const router = useRouter();
  const { db } = useUserData();
  const [name, setName] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("rotation");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    const routine = await createRoutine(db, profile, { name: name || t("defaultName"), scheduleType });
    onOpenChange(false);
    setName("");
    setBusy(false);
    setNavDirection("forward");
    router.push(`/routines/edit?id=${routine.id}`);
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={t("newRoutine")}
      closeLabel={common("cancel")}
      footer={
        <Button size="lg" className="w-full" disabled={busy} onClick={() => void handleSubmit()}>
          {t("create")}
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 pt-1">
        <Group>
          <TextRow
            id="routine-name"
            aria-label={t("name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            maxLength={80}
            enterKeyHint="done"
          />
        </Group>
        <Group title={t("schedule")} footer={t(`scheduleHints.${scheduleType}`)}>
          <GroupRow className="py-3">
            <SegmentedControl<ScheduleType>
              aria-label={t("schedule")}
              value={scheduleType}
              options={(["rotation", "weekly"] as const).map((value) => ({ value, label: t(`scheduleTypes.${value}`) }))}
              onValueChange={setScheduleType}
            />
          </GroupRow>
        </Group>
      </form>
    </Drawer>
  );
}
