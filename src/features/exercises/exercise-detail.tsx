"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { deleteCustomExercise } from "@/data/repositories/exercises";
import { exerciseDisplayName } from "@/domain/exercises/names";
import { usePrefs } from "@/features/preferences/prefs";
import { PageHeader } from "@/features/shell/page-header";
import { useUserData } from "@/features/user-data/user-data-context";
import { ExerciseMotion } from "./exercise-motion";
import { useCatalogNames, useExercise } from "./use-exercises";
import { useExerciseLabels } from "./use-exercise-labels";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">{children}</dd>
    </div>
  );
}

function Tag({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <span
      className={
        strong
          ? "rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground"
          : "rounded-full bg-surface-2 px-3 py-1 text-sm"
      }
    >
      {children}
    </span>
  );
}

export function ExerciseDetail() {
  const t = useTranslations("exercises.detail");
  const tExercises = useTranslations("exercises");
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
        <p className="px-4 pt-6 text-muted-foreground">{t("notFound")}</p>
      </>
    );
  }

  const name = exerciseDisplayName(exercise, names);
  const isCustom = Boolean(exercise.created_by);
  const isOwn = exercise.created_by === user.id;

  async function handleDelete() {
    if (!exercise || !window.confirm(t("deleteConfirm", { name }))) return;
    await deleteCustomExercise(db, user.id, exercise);
    router.replace("/exercises");
  }

  return (
    <>
      <PageHeader title={tExercises("title")} backFallback="/exercises" />
      <article className="flex flex-col gap-6 px-4 pt-2 pb-10">
        {exercise.image_urls.length > 0 ? (
          <ExerciseMotion urls={exercise.image_urls} alt={(step) => t("imageAlt", { name, step })} />
        ) : null}

        <div className="flex flex-col gap-1">
          <h2 className="heading text-3xl">{name}</h2>
          {name !== exercise.name ? (
            <p className="text-sm text-muted-foreground">{t("originalName", { name: exercise.name })}</p>
          ) : null}
        </div>

        <dl className="grid gap-4">
          <Fact label={t("primary")}>
            <Tag strong>{labels.muscle(exercise.primary_muscle)}</Tag>
          </Fact>
          {exercise.secondary_muscles.length > 0 ? (
            <Fact label={t("secondary")}>
              {exercise.secondary_muscles.map((muscle) => (
                <Tag key={muscle}>{labels.muscle(muscle)}</Tag>
              ))}
            </Fact>
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            {exercise.equipment ? (
              <Fact label={t("equipment")}>
                <Tag>{labels.equipment(exercise.equipment)}</Tag>
              </Fact>
            ) : null}
            {exercise.category ? (
              <Fact label={t("category")}>
                <Tag>{labels.category(exercise.category)}</Tag>
              </Fact>
            ) : null}
            {exercise.mechanic ? (
              <Fact label={t("mechanic")}>
                <Tag>{labels.mechanic(exercise.mechanic)}</Tag>
              </Fact>
            ) : null}
          </div>
        </dl>

        <section className="flex flex-col gap-3">
          <h3 className="heading text-xl">{t("instructions")}</h3>
          {!isCustom && locale !== "en" ? (
            <p className="text-sm text-muted-foreground">{t("instructionsInEnglish")}</p>
          ) : null}
          {exercise.instructions.length > 0 ? (
            <ol className="flex flex-col gap-3">
              {exercise.instructions.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span className="numeric mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm">
                    {index + 1}
                  </span>
                  <p className="leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground">{t("noInstructions")}</p>
          )}
        </section>

        {isOwn ? (
          <div className="flex gap-3">
            <Link href={`/exercises/edit?id=${exercise.id}`} className={buttonVariants({ variant: "secondary", className: "flex-1" })}>
              <Pencil />
              {t("edit")}
            </Link>
            <Button variant="destructive" className="flex-1" onClick={() => void handleDelete()}>
              <Trash2 />
              {t("delete")}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("source")}</p>
        )}
      </article>
    </>
  );
}
