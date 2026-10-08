"use client";

import { Plus } from "lucide-react";
import { Suspense } from "react";
import { useTranslations } from "use-intl";
import { IconLink } from "@/components/ui/icon-button";
import { ExerciseLibrary } from "@/features/exercises/exercise-library";
import { PageHeader } from "@/features/shell/page-header";
import { PageTransition } from "@/features/shell/page-transition";
import { ScreenFallback } from "@/features/shell/screen-fallback";

export default function ExercisesPage() {
  const t = useTranslations("exercises");
  return (
    <PageTransition>
      <PageHeader
        title={t("title")}
        backFallback="/routines"
        seamless
        actions={
          <IconLink href="/exercises/edit" aria-label={t("create")}>
            <Plus strokeWidth={2.4} />
          </IconLink>
        }
      />
      <Suspense fallback={<ScreenFallback />}>
        <ExerciseLibrary />
      </Suspense>
    </PageTransition>
  );
}
