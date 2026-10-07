"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { saveCustomExercise } from "@/data/repositories/exercises";
import {
  type CustomExerciseInput,
  customExerciseInputSchema,
  inputFromExercise,
} from "@/domain/exercises/custom-exercise";
import { CATEGORIES, EQUIPMENT, MUSCLES, type Muscle } from "@/domain/exercises/taxonomy";
import type { Exercise } from "@/domain/schemas";
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
        <p className="px-4 pt-6 text-muted-foreground">{t("detail.notFound")}</p>
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
    router.replace(`/exercises/detail?id=${id}`);
  }

  const errorText = (key: keyof FormState) => {
    const code = errors[key];
    return code === "nameRequired" || code === "primaryRequired" ? t(`errors.${code}`) : code;
  };

  return (
    <>
      <PageHeader title={existing ? t("editTitle") : t("newTitle")} backFallback="/exercises" />
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 px-4 pt-2 pb-10">
        <Field label={t("name")} htmlFor="name" error={errorText("name")}>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={t("namePlaceholder")}
            maxLength={120}
            aria-invalid={Boolean(errors.name)}
            autoFocus={!existing}
          />
        </Field>

        <Field label={t("primaryMuscle")} htmlFor="primary" error={errorText("primaryMuscle")}>
          <NativeSelect
            id="primary"
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
          </NativeSelect>
        </Field>

        <Field label={t("secondaryMuscles")}>
          <div className="flex flex-wrap gap-2">
            {MUSCLES.filter((muscle) => muscle !== form.primaryMuscle).map((muscle) => (
              <Chip
                key={muscle}
                active={form.secondaryMuscles.includes(muscle)}
                aria-pressed={form.secondaryMuscles.includes(muscle)}
                onClick={() => toggleSecondary(muscle)}
              >
                {labels.muscle(muscle)}
              </Chip>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("equipment")} htmlFor="equipment">
            <NativeSelect
              id="equipment"
              value={form.equipment ?? ""}
              onChange={(e) => set("equipment", (e.target.value || null) as FormState["equipment"])}
            >
              <option value="">{t("none")}</option>
              {EQUIPMENT.map((key) => (
                <option key={key} value={key}>
                  {labels.equipment(key)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("category")} htmlFor="category">
            <NativeSelect
              id="category"
              value={form.category ?? ""}
              onChange={(e) => set("category", (e.target.value || null) as FormState["category"])}
            >
              <option value="">{t("none")}</option>
              {CATEGORIES.map((key) => (
                <option key={key} value={key}>
                  {labels.category(key)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Field label={t("instructions")} htmlFor="instructions" hint={t("instructionsHint")}>
          <Textarea
            id="instructions"
            value={form.instructions}
            onChange={(e) => set("instructions", e.target.value)}
            rows={4}
          />
        </Field>

        <Button type="submit" size="lg" disabled={saving}>
          {t("save")}
        </Button>
      </form>
    </>
  );
}
