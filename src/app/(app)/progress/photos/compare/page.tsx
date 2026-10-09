import { Suspense } from "react";
import { CompareScreen } from "@/features/photos/compare-screen";
import { PageTransition } from "@/features/shell/page-transition";
import { ScreenFallback } from "@/features/shell/screen-fallback";

export default function ComparePage() {
  return (
    <PageTransition>
      <Suspense fallback={<ScreenFallback />}>
        <CompareScreen />
      </Suspense>
    </PageTransition>
  );
}
