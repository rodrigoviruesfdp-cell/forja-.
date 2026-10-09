"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { useConfirm } from "@/components/ui/confirm";
import { createDemo } from "@/data/demo/demo";
import { TEMPLATES } from "@/domain/routines/templates";
import { usePrefs } from "@/features/preferences/prefs";
import { useRoutineLabels } from "@/features/routines/use-routine-labels";
import { setNavDirection } from "@/features/shell/nav-direction";
import { useUserData } from "@/features/user-data/user-data-context";
import { setDemoMode } from "./demo-mode";

/** Going into the sample data and back to yours (both asked first). */
export function useDemo() {
  const t = useTranslations("demo");
  const common = useTranslations("common");
  const tSports = useTranslations("sports");
  const { db, user, demo } = useUserData();
  const confirm = useConfirm();
  const router = useRouter();
  const labels = useRoutineLabels();
  const { units } = usePrefs();

  async function enter() {
    const ok = await confirm({ title: t("enterTitle"), message: t("enterMessage"), confirmLabel: t("enter"), cancelLabel: common("cancel") });
    if (!ok) return;
    const id = toast.loading(t("preparing"));
    try {
      await createDemo(db, user.id, { names: labels.templateNames(TEMPLATES.abcdSport), sportName: (sport) => tSports(sport), unit: units });
      setDemoMode(user.id, true);
      toast.success(t("entered"), { id });
      setNavDirection("forward");
      router.push("/today");
    } catch {
      toast.error(t("error"), { id });
    }
  }

  async function leave() {
    const ok = await confirm({ title: t("leaveTitle"), message: t("leaveMessage"), confirmLabel: t("leave"), cancelLabel: common("cancel") });
    if (!ok) return;
    setDemoMode(user.id, false);
    toast(t("left"));
    // Screens of sample rows (a session, an exercise) do not exist in your data.
    router.push("/today");
  }

  return { demo, enter, leave };
}
