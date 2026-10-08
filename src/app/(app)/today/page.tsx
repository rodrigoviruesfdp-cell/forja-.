import { Suspense } from "react";
import { PageTransition } from "@/features/shell/page-transition";
import { ScreenFallback } from "@/features/shell/screen-fallback";
import { TodayScreen } from "@/features/today/today-screen";

export default function TodayPage() {
  return (
    <PageTransition>
      <Suspense fallback={<ScreenFallback />}>
        <TodayScreen />
      </Suspense>
    </PageTransition>
  );
}
