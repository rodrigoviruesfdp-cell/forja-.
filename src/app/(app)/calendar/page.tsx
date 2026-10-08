import { CalendarScreen } from "@/features/calendar/calendar-screen";
import { PageTransition } from "@/features/shell/page-transition";

export default function CalendarPage() {
  return (
    <PageTransition>
      <CalendarScreen />
    </PageTransition>
  );
}
