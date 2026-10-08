import { cn } from "@/lib/utils";

/** App mark: the yellow plate (the one accent color) next to the name in SF Pro Rounded. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-rounded text-title-1", className)}>
      <span aria-hidden className="inline-block size-[0.78em] rounded-[0.24em] bg-primary shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)]" />
      Forja
    </span>
  );
}
