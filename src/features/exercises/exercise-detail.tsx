"use client";

import { Pencil } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Card } from "@/components/ui/card";
import { Group, GroupRow, GroupRowButton } from "@/components/ui/group";
import { IconLink } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { saveRows } from "@/data/local/mutations";
import { deleteCustomExercise } from "@/data/repositories/exercises";
import { exerciseDisplayName } from "@/domain/exercises/names";
import { usePrefs } from "@/features/preferences/prefs";
import { setNavDirection } from "@/features/shell/nav-direction";
import { PageHeader } from "@/features/shell/page-header";
import { useUserData } from "@/features/user-data/user-data-context";
import { ExerciseMotion } from "./exercise-motion";
import { useCatalogNames, useExercise } from "./use-exercises";
import { useExerciseLabels } from "./use-exercise-labels";

function FactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <GroupRow className="justify-between">
      <span>{label}</span>
      <span className="text-right text-muted-foreground">{children}</span>
    </GroupRow>
  );
}

export function ExerciseDetail() {
  const t = useTranslations("exercises.detail");
  const tExercises = useTranslations("exercises");
  const common = useTranslations("common");
  const router = useRouter();
  const id = useSearchParams().get("id");
  const exercise = useExercise(id);
  const names = useCatalogNames();
  const labels = useExerciseLabels();
  const { locale } = usePrefs();
  const { db, user } = useUserData();

  if (exercise === undefined) {
    return (
      <div className="flex justify-center p-10">
        <Spinner />
      </div>
    );
  }

  if (exercise === null) {
    return (
      <>
        <PageHeader title={tExercises("title")} backFallback="/exercises" />
        <p className="px-4 pt-2 text-muted-foreground">{t("notFound")}</p>
      </>
    );
  }

  const name = exerciseDisplayName(exercise, names);
  const isCustom = Boolean(exercise.created_by);
  const isOwn = exercise.created_by === user.id;

  async function handleDelete() {
    if (!exercise) return;
    const before = exercise;
    await deleteCustomExercise(db, user.id, exercise);
    // Soft delete: undo just writes the previous version back.
    toast(t("deleted", { name }), {
      action: { label: common("undo"), onClick: () => void saveRows(db, "exercises", [{ ...before, deleted_at: null }]) },
    });
    setNavDirection("back");
    router.replace("/exercises");
  }

  return (
    <>
      <PageHeader
        title={name}
        subtitle={labels.muscle(exercise.primary_muscle)}
        backFallback="/exercises"
        actions={
          isOwn ? (
            <IconLink href={`/exercises/edit?id=${exercise.id}`} aria-label={t("edit")}>
              <Pencil strokeWidth={2.2} className="size-5!" />
            </IconLink>
          ) : null
        }
      />
      <Stagger className="flex flex-col gap-6 px-4 pb-8">
        {name !== exercise.name ? (
          <StaggerItem>
            <p className="-mt-3 text-subhead text-muted-foreground">{t("originalName", { name: exercise.name })}</p>
          </StaggerItem>
        ) : null}

        {exercise.image_urls.length > 0 ? (
          <StaggerItem>
            <Card size="tile">
              <ExerciseMotion urls={exercise.image_urls} alt={(step) => t("imageAlt", { name, step })} />
            </Card>
          </StaggerItem>
        ) : null}

        <StaggerItem>
          <Group>
            <FactRow label={t("primary")}>{labels.muscle(exercise.primary_muscle)}</FactRow>
            {exercise.secondary_muscles.length > 0 ? (
              <FactRow label={t("secondary")}>
                {exercise.secondary_muscles.map((muscle) => labels.muscle(muscle)).join(", ")}
              </FactRow>
            ) : null}
            {exercise.equipment ? <FactRow label={t("equipment")}>{labels.equipment(exercise.equipment)}</FactRow> : null}
            {exercise.category ? <FactRow label={t("category")}>{labels.category(exercise.category)}</FactRow> : null}
            {exercise.mechanic ? <FactRow label={t("mechanic")}>{labels.mechanic(exercise.mechanic)}</FactRow> : null}
          </Group>
        </StaggerItem>

        <StaggerItem>
          <Group
            title={t("instructions")}
            footer={!isCustom && locale !== "en" ? t("instructionsInEnglish") : undefined}
          >
            {exercise.instructions.length > 0 ? (
              exercise.instructions.map((step, index) => (
                <GroupRow key={index} className="items-start gap-3.5 py-3 [--sep-inset:3.25rem]">
                  <span className="numeric flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-footnote">
                    {index + 1}
                  </span>
                  <p className="text-callout leading-relaxed">{step}</p>
                </GroupRow>
              ))
            ) : (
              <GroupRow className="text-muted-foreground">{t("noInstructions")}</GroupRow>
            )}
          </Group>
        </StaggerItem>

        <StaggerItem>
          {isOwn ? (
            <Group>
              <GroupRowButton tone="destructive" onClick={() => void handleDelete()}>
                {t("delete")}
              </GroupRowButton>
            </Group>
          ) : (
            <p className="px-4 text-caption text-tertiary-foreground">{t("source")}</p>
          )}
        </StaggerItem>
      </Stagger>
    </>
  );
}
