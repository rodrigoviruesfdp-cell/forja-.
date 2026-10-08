import { cn } from "@/lib/utils";

const SPOKES = 8;

/** iOS activity indicator: eight spokes, the brightest one going round. */
export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <svg
      role="status"
      aria-label={label}
      viewBox="0 0 24 24"
      className={cn("size-5 text-muted-foreground", className)}
      style={{ animation: `activity-spin 0.8s steps(${SPOKES}) infinite` }}
    >
      {Array.from({ length: SPOKES }, (_, index) => (
        <line
          key={index}
          x1="12"
          y1="3"
          x2="12"
          y2="7.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity={1 - (index / SPOKES) * 0.8}
          transform={`rotate(${-index * (360 / SPOKES)} 12 12)`}
        />
      ))}
    </svg>
  );
}
