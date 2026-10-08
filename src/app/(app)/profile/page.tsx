import { PageTransition } from "@/features/shell/page-transition";
import { ProfileScreen } from "@/features/profile/profile-screen";

export default function ProfilePage() {
  return (
    <PageTransition>
      <ProfileScreen />
    </PageTransition>
  );
}
