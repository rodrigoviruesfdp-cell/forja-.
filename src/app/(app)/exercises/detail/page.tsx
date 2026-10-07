import { Suspense } from "react";
import { ExerciseDetail } from "@/features/exercises/exercise-detail";
import { ScreenFallback } from "@/features/shell/screen-fallback";

export default function ExerciseDetailPage() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <ExerciseDetail />
    </Suspense>
  );
}
