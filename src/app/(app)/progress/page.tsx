import { ProgressScreen } from "@/features/progress/progress-screen";
import { PageTransition } from "@/features/shell/page-transition";

export default function ProgressPage() {
  return (
    <PageTransition>
      <ProgressScreen />
    </PageTransition>
  );
}
