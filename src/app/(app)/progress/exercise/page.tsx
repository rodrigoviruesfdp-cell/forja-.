import { Suspense } from "react";
import { ExerciseProgressScreen } from "@/features/progress/exercise-progress";
import { PageTransition } from "@/features/shell/page-transition";
import { ScreenFallback } from "@/features/shell/screen-fallback";

export default function ExerciseProgressPage() {
  return (
    <PageTransition>
      <Suspense fallback={<ScreenFallback />}>
        <ExerciseProgressScreen />
      </Suspense>
    </PageTransition>
  );
}
