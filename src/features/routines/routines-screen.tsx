"use client";

import { ChevronRight, Dumbbell, ListChecks } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "use-intl";
import { useExercises } from "@/features/exercises/use-exercises";
import { PageHeader } from "@/features/shell/page-header";

export function RoutinesScreen() {
  const t = useTranslations("routines");
  const exercises = useExercises();

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex flex-col gap-4 px-4 pt-4">
        <Link href="/exercises" className="flex items-center gap-4 rounded-xl bg-surface p-5 active:bg-surface-2">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="size-6" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="heading text-xl">{t("libraryTitle")}</span>
            <span className="text-sm text-muted-foreground">{t("libraryBody", { count: exercises?.length ?? 0 })}</span>
          </span>
          <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
        </Link>

        <section className="flex flex-col gap-2 rounded-xl border border-dashed p-5">
          <span className="flex items-center gap-2 text-muted-foreground">
            <ListChecks className="size-5" />
            <span className="font-semibold">{t("builderSoonTitle")}</span>
          </span>
          <p className="text-muted-foreground">{t("builderSoon")}</p>
        </section>
      </div>
    </>
  );
}
