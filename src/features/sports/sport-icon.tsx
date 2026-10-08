import { Activity, Bike, Dumbbell, Footprints, type LucideIcon, Mountain, MountainSnow, Snowflake, Waves } from "lucide-react";
import { canonicalSport, type SportKey } from "@/domain/sports";

const ICONS: Partial<Record<SportKey, LucideIcon>> = {
  surf: Waves,
  swimming: Waves,
  running: Footprints,
  cycling: Bike,
  hiking: Mountain,
  climbing: MountainSnow,
  skiing: Snowflake,
};

/** An icon for a session: the dumbbell for the gym, a sport icon where there is one. */
export function SportIcon({ kind, sport, className }: { kind: "gym" | "sport"; sport: string | null; className?: string }) {
  const Icon = kind === "gym" ? Dumbbell : (ICONS[canonicalSport(sport ?? "") as SportKey] ?? Activity);
  return <Icon aria-hidden className={className} strokeWidth={2.1} />;
}
