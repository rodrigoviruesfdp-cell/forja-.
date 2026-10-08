"use client";

import { ChevronRight, Plus } from "lucide-react";
import { useTranslations } from "use-intl";
import { Drawer } from "@/components/ui/drawer";
import { Group, GroupRowButton } from "@/components/ui/group";
import { rotationLetter, rotationOrder } from "@/domain/routines/builder";
import type { RoutineDay } from "@/domain/schemas";
import type { RoutineTree } from "@/features/routines/use-routines";
import { useStartSession } from "./use-start-session";

/** "Entrenar otro día": any gym day of the active routine, or a free session. */
export function PickDaySheet({
  open,
  onOpenChange,
  tree,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tree: RoutineTree | null;
}) {
  const t = useTranslations("session");
  const tRoutines = useTranslations("routines");
  const common = useTranslations("common");
  const start = useStartSession();
  const rotation = tree?.routine.schedule_type === "rotation";
  const days = tree ? (rotation ? rotationOrder(tree.days) : tree.days.filter((day) => day.kind === "gym")) : [];

  function pick(day: RoutineDay | null, title: string) {
    onOpenChange(false);
    void start(day, title);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={t("pickDayTitle")} closeLabel={common("close")}>
      <div className="flex flex-col gap-5 pt-1 pb-2">
        {days.length > 0 ? (
          <Group footer={t("pickDayFooter")}>
            {days.map((day, index) => {
              const count = tree?.exercises.get(day.id)?.length ?? 0;
              return (
                <GroupRowButton key={day.id} className="[--sep-inset:4.25rem]" onClick={() => pick(day, day.name)}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-foreground font-rounded text-headline text-background">
                    {rotation ? rotationLetter(index) : day.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{day.name}</span>
                    <span className="block text-subhead text-muted-foreground">{tRoutines("exerciseCount", { count })}</span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-tertiary-foreground" />
                </GroupRowButton>
              );
            })}
          </Group>
        ) : null}
        <Group>
          <GroupRowButton className="[--sep-inset:4.25rem]" onClick={() => pick(null, t("freeTitle"))}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-surface-2">
              <Plus className="size-5" strokeWidth={2.4} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{t("free")}</span>
              <span className="block text-subhead text-muted-foreground">{t("freeHint")}</span>
            </span>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-tertiary-foreground" />
          </GroupRowButton>
        </Group>
      </div>
    </Drawer>
  );
}
