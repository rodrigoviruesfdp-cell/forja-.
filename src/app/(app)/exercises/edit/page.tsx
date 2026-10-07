import { Suspense } from "react";
import { ExerciseFormScreen } from "@/features/exercises/exercise-form";
import { ScreenFallback } from "@/features/shell/screen-fallback";

export default function ExerciseEditPage() {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <ExerciseFormScreen />
    </Suspense>
  );
}
