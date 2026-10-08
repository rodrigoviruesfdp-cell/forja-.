"use client";

import { CircleCheck, Copy, Pencil, Share, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { ActionList } from "@/components/ui/action-list";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Drawer } from "@/components/ui/drawer";
import { TextRow } from "@/components/ui/form-rows";
import { Group } from "@/components/ui/group";
import { copyRoutine, deleteRoutine, restore, setActiveRoutine, updateRoutine } from "@/data/repositories/routines";
import type { Profile, Routine } from "@/domain/schemas";
import { setNavDirection } from "@/features/shell/nav-direction";
import { useUserData } from "@/features/user-data/user-data-context";

interface RoutineActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine: Routine;
  profile: Profile;
}

/** ⋯ menu of a routine: rename, duplicate, make active, delete (confirmed, with undo). */
export function RoutineActionsSheet({ open, onOpenChange, routine, profile }: RoutineActionsSheetProps) {
  const t = useTranslations("routines");
  const tShare = useTranslations("share");
  const common = useTranslations("common");
  const router = useRouter();
  const confirm = useConfirm();
  const { db } = useUserData();
  const [view, setView] = useState<"main" | "rename">("main");
  const [name, setName] = useState(routine.name);
  const isActive = profile.active_routine_id === routine.id;

  function close() {
    onOpenChange(false);
  }

  async function rename() {
    await updateRoutine(db, routine, { name });
    close();
  }

  async function duplicate() {
    close();
    const copy = await copyRoutine(db, routine, t("copyName", { name: routine.name }));
    toast.success(t("routineCopied"));
    setNavDirection("forward");
    router.push(`/routines/edit?id=${copy.id}`);
  }

  async function remove() {
    close();
    const ok = await confirm({
      title: t("deleteRoutineTitle", { name: routine.name }),
      message: t("deleteRoutineMessage"),
      confirmLabel: t("deleteRoutine"),
      cancelLabel: common("cancel"),
      destructive: true,
    });
    if (!ok) return;
    const undo = await deleteRoutine(db, profile, routine);
    toast(t("routineDeleted"), { action: { label: common("undo"), onClick: () => void restore(db, undo) } });
    setNavDirection("back");
    router.replace("/routines");
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setName(routine.name);
        else setView("main");
      }}
      title={view === "rename" ? t("renameTitle") : routine.name}
      closeLabel={common("close")}
    >
      {view === "rename" ? (
        <form
          className="flex flex-col gap-4 pt-1"
          onSubmit={(event) => {
            event.preventDefault();
            void rename();
          }}
        >
          <Group>
            <TextRow
              aria-label={t("name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoFocus
              enterKeyHint="done"
            />
          </Group>
          <Button type="submit" size="lg" className="w-full">
            {common("save")}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-3 pt-1">
          <ActionList
            actions={[
              { key: "rename", label: t("renameTitle"), Icon: Pencil, onSelect: () => setView("rename") },
              { key: "duplicate", label: t("duplicateRoutine"), Icon: Copy, onSelect: () => void duplicate() },
              {
                key: "share",
                label: tShare("shareRoutine"),
                Icon: Share,
                onSelect: () => {
                  close();
                  setNavDirection("forward");
                  router.push(`/share?routine=${routine.id}`);
                },
              },
              ...(isActive
                ? []
                : [
                    {
                      key: "activate",
                      label: t("setActive"),
                      Icon: CircleCheck,
                      onSelect: () => {
                        close();
                        void setActiveRoutine(db, profile, routine.id);
                      },
                    },
                  ]),
            ]}
          />
          <ActionList
            actions={[{ key: "delete", label: t("deleteRoutine"), Icon: Trash2, destructive: true, onSelect: () => void remove() }]}
          />
        </div>
      )}
    </Drawer>
  );
}
