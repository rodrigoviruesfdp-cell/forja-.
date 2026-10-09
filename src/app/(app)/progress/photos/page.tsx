import { PhotosScreen } from "@/features/photos/photos-screen";
import { PageTransition } from "@/features/shell/page-transition";

export default function PhotosPage() {
  return (
    <PageTransition>
      <PhotosScreen />
    </PageTransition>
  );
}
