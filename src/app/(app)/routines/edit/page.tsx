import { Suspense } from "react";
import { RoutineEditorScreen } from "@/features/routines/routine-editor";
import { PageTransition } from "@/features/shell/page-transition";
import { ScreenFallback } from "@/features/shell/screen-fallback";

export default function RoutineEditPage() {
  return (
    <PageTransition>
      <Suspense fallback={<ScreenFallback />}>
        <RoutineEditorScreen />
      </Suspense>
    </PageTransition>
  );
}
