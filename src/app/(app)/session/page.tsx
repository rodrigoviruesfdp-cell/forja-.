import { Suspense } from "react";
import { SessionScreen } from "@/features/session/session-screen";
import { PageTransition } from "@/features/shell/page-transition";
import { ScreenFallback } from "@/features/shell/screen-fallback";

export default function SessionPage() {
  return (
    <PageTransition>
      <Suspense fallback={<ScreenFallback />}>
        <SessionScreen />
      </Suspense>
    </PageTransition>
  );
}
