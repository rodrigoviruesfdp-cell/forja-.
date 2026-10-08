import { Suspense } from "react";
import { RoutinesScreen } from "@/features/routines/routines-screen";
import { PageTransition } from "@/features/shell/page-transition";
import { ScreenFallback } from "@/features/shell/screen-fallback";

export default function RoutinesPage() {
  return (
    <PageTransition>
      <Suspense fallback={<ScreenFallback />}>
        <RoutinesScreen />
      </Suspense>
    </PageTransition>
  );
}
