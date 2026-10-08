import { Suspense } from "react";
import { ExerciseDetail } from "@/features/exercises/exercise-detail";
import { PageTransition } from "@/features/shell/page-transition";
import { ScreenFallback } from "@/features/shell/screen-fallback";

export default function ExerciseDetailPage() {
  return (
    <PageTransition>
      <Suspense fallback={<ScreenFallback />}>
        <ExerciseDetail />
      </Suspense>
    </PageTransition>
  );
}
