import { Suspense } from "react";
import { ExerciseFormScreen } from "@/features/exercises/exercise-form";
import { PageTransition } from "@/features/shell/page-transition";
import { ScreenFallback } from "@/features/shell/screen-fallback";

export default function ExerciseEditPage() {
  return (
    <PageTransition>
      <Suspense fallback={<ScreenFallback />}>
        <ExerciseFormScreen />
      </Suspense>
    </PageTransition>
  );
}
