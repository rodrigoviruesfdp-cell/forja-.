import type { LucideIcon } from "lucide-react";

export function ComingSoon({ Icon, text }: { Icon: LucideIcon; text: string }) {
  return (
    <div className="mx-4 mt-6 flex flex-col items-start gap-3 rounded-xl border border-dashed p-6 text-muted-foreground">
      <Icon className="size-8" strokeWidth={1.6} />
      <p>{text}</p>
    </div>
  );
}
