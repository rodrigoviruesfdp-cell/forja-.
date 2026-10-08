"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { SelectRow, TextAreaRow, TextRow } from "@/components/ui/form-rows";
import { Group, GroupRow } from "@/components/ui/group";
import { Spinner } from "@/components/ui/spinner";
import { saveCustomExercise } from "@/data/repositories/exercises";
import {
  type CustomExerciseInput,
  customExerciseInputSchema,
  inputFromExercise,
} from "@/domain/exercises/custom-exercise";
import { CATEGORIES, EQUIPMENT, MUSCLES, type Muscle } from "@/domain/exercises/taxonomy";
import type { Exercise } from "@/domain/schemas";
import { setNavDirection } from "@/features/shell/nav-direction";
import { PageHeader } from "@/features/shell/page-header";
import { useUserData } from "@/features/user-data/user-data-context";
import { useExercise } from "./use-exercises";
import { useExerciseLabels } from "./use-exercise-labels";

type FormState = Omit<CustomExerciseInput, "primaryMuscle"> & { primaryMuscle: Muscle | "" };

const EMPTY: FormState = {
  name: "",
  primaryMuscle: "",
  secondaryMuscles: [],
  equipment: null,
  category: "strength",
  instructions: "",
};

/** /exercises/edit creates a new exercise; /exercises/edit?id=... edits one of yours. */
export function ExerciseFormScreen() {
  const id = useSearchParams().get("id");
  const existing = useExercise(id);
  const t = useTranslations("exercises");

  if (id && existing === undefined) {
    return (
      <div className="flex justify-center p-10">
        <Spinner />
      </div>
    );
  }
  if (id && existing === null) {
    return (
      <>
        <PageHeader title={t("form.editTitle")} backFallback="/exercises" />
        <p className="px-4 pt-2 text-muted-foreground">{t("detail.notFound")}</p>
      </>
    );
  }
  return <ExerciseForm key={existing?.id ?? "new"} existing={existing ?? undefined} />;
}

function ExerciseForm({ existing }: { existing?: Exercise }) {
  const t = useTranslations("exercises.form");
  const router = useRouter();
  const labels = useExerciseLabels();
  const { db, user } = useUserData();
  const [form, setForm] = useState<FormState>(() => (existing ? inputFromExercise(existing) : EMPTY));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    // The message goes away as soon as the field is touched again.
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  function toggleSecondary(muscle: Muscle) {
    set(
      "secondaryMuscles",
      form.secondaryMuscles.includes(muscle)
        ? form.secondaryMuscles.filter((m) => m !== muscle)
        : [...form.secondaryMuscles, muscle],
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = customExerciseInputSchema.safeParse(form);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        next[key] ??= key === "primaryMuscle" ? "primaryRequired" : key === "name" ? "nameRequired" : issue.message;
      }
      setErrors(next);
      return;
    }
    setSaving(true);
    const id = await saveCustomExercise(db, user.id, parsed.data, existing);
    toast.success(existing ? t("savedChanges") : t("created", { name: parsed.data.name }));
    setNavDirection(existing ? "back" : "forward");
    router.replace(`/exercises/detail?id=${id}`);
  }

  const errorText = (key: keyof FormState) => {
    const code = errors[key];
    return code === "nameRequired" || code === "primaryRequired" ? t(`errors.${code}`) : code;
  };
  const errorFooter = (key: keyof FormState) => {
    const text = errorText(key);
    return text ? (
      <span role="alert" className="text-destructive">
        {text}
      </span>
    ) : undefined;
  };

  return (
    <>
      <PageHeader title={existing ? t("editTitle") : t("newTitle")} backFallback="/exercises" />
      <form onSubmit={handleSubmit} noValidate>
        <Stagger className="flex flex-col gap-7 px-4 pb-8">
          <StaggerItem>
            <Group title={t("name")} footer={errorFooter("name")}>
              <TextRow
                id="name"
                aria-label={t("name")}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={t("namePlaceholder")}
                maxLength={120}
                aria-invalid={Boolean(errors.name)}
                autoFocus={!existing}
              />
            </Group>
          </StaggerItem>

          <StaggerItem>
            <Group title={t("muscles")} footer={errorFooter("primaryMuscle")}>
              <SelectRow
                id="primary"
                label={t("primaryMuscle")}
                valueLabel={
                  form.primaryMuscle ? (
                    labels.muscle(form.primaryMuscle)
                  ) : (
                    <span className={errors.primaryMuscle ? "text-destructive" : undefined}>{t("chooseMuscle")}</span>
                  )
                }
                value={form.primaryMuscle}
                onChange={(e) => set("primaryMuscle", e.target.value as Muscle)}
                aria-invalid={Boolean(errors.primaryMuscle)}
              >
                <option value="" disabled>
                  {t("chooseMuscle")}
                </option>
                {MUSCLES.map((muscle) => (
                  <option key={muscle} value={muscle}>
                    {labels.muscle(muscle)}
                  </option>
                ))}
              </SelectRow>
              <GroupRow className="flex-col items-stretch gap-3 py-3">
                <span>{t("secondaryMuscles")}</span>
                <div className="flex flex-wrap gap-2">
                  {MUSCLES.filter((muscle) => muscle !== form.primaryMuscle).map((muscle) => (
                    <Chip
                      key={muscle}
                      className="h-9 px-3.5 text-footnote"
                      active={form.secondaryMuscles.includes(muscle)}
                      aria-pressed={form.secondaryMuscles.includes(muscle)}
                      onClick={() => toggleSecondary(muscle)}
                    >
                      {labels.muscle(muscle)}
                    </Chip>
                  ))}
                </div>
              </GroupRow>
            </Group>
          </StaggerItem>

          <StaggerItem>
            <Group title={t("details")}>
              <SelectRow
                id="equipment"
                label={t("equipment")}
                valueLabel={form.equipment ? labels.equipment(form.equipment) : t("none")}
                value={form.equipment ?? ""}
                onChange={(e) => set("equipment", (e.target.value || null) as FormState["equipment"])}
              >
                <option value="">{t("none")}</option>
                {EQUIPMENT.map((key) => (
                  <option key={key} value={key}>
                    {labels.equipment(key)}
                  </option>
                ))}
              </SelectRow>
              <SelectRow
                id="category"
                label={t("category")}
                valueLabel={form.category ? labels.category(form.category) : t("none")}
                value={form.category ?? ""}
                onChange={(e) => set("category", (e.target.value || null) as FormState["category"])}
              >
                <option value="">{t("none")}</option>
                {CATEGORIES.map((key) => (
                  <option key={key} value={key}>
                    {labels.category(key)}
                  </option>
                ))}
              </SelectRow>
            </Group>
          </StaggerItem>

          <StaggerItem>
            <Group title={t("instructions")} footer={t("instructionsHint")}>
              <TextAreaRow
                id="instructions"
                aria-label={t("instructions")}
                value={form.instructions}
                onChange={(e) => set("instructions", e.target.value)}
                rows={4}
              />
            </Group>
          </StaggerItem>

          <StaggerItem>
            <Button type="submit" size="lg" className="w-full" disabled={saving}>
              {t("save")}
            </Button>
          </StaggerItem>
        </Stagger>
      </form>
    </>
  );
}
