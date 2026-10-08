import { Suspense } from "react";
import { PageTransition } from "@/features/shell/page-transition";
import { ScreenFallback } from "@/features/shell/screen-fallback";
import { ShareScreen } from "@/features/share/share-screen";

export default function SharePage() {
  return (
    <PageTransition>
      <Suspense fallback={<ScreenFallback />}>
        <ShareScreen />
      </Suspense>
    </PageTransition>
  );
}
