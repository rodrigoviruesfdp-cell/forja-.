import { PageTransition } from "@/features/shell/page-transition";
import { CommunityScreen } from "@/features/community/community-screen";

export default function CommunityPage() {
  return (
    <PageTransition>
      <CommunityScreen />
    </PageTransition>
  );
}
