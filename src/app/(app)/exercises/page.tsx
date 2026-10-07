"use client";

import { Suspense } from "react";
import { useTranslations } from "use-intl";
import { ExerciseLibrary } from "@/features/exercises/exercise-library";
import { PageHeader } from "@/features/shell/page-header";
import { ScreenFallback } from "@/features/shell/screen-fallback";

export default function ExercisesPage() {
  const t = useTranslations("exercises");
  return (
    <>
      <PageHeader title={t("title")} backFallback="/routines" />
      <Suspense fallback={<ScreenFallback />}>
        <ExerciseLibrary />
      </Suspense>
    </>
  );
}
