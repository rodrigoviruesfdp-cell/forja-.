import { Suspense } from "react";
import { AchievementsScreen } from "@/features/achievements/achievements-screen";
import { PageTransition } from "@/features/shell/page-transition";
import { ScreenFallback } from "@/features/shell/screen-fallback";

export default function AchievementsPage() {
  return (
    <PageTransition>
      <Suspense fallback={<ScreenFallback />}>
        <AchievementsScreen />
      </Suspense>
    </PageTransition>
  );
}
