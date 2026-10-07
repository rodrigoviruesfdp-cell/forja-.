import { cn } from "@/lib/utils";

/** App name set in the condensed heavy cut used for numbers: the brand is the type. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("heading inline-flex items-baseline gap-1.5 text-3xl", className)}>
      <span aria-hidden className="inline-block size-[0.55em] translate-y-[-0.05em] rounded-[3px] bg-primary" />
      Forja
    </span>
  );
}
