import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ComingSoon({ Icon, text }: { Icon: LucideIcon; text: string }) {
  return (
    <div className="px-4 pt-2">
      <Card className="flex flex-col items-start gap-3">
        <span className="flex size-11 items-center justify-center rounded-concentric bg-planned/12 text-planned">
          <Icon className="size-6" strokeWidth={1.9} />
        </span>
        <p className="text-callout text-muted-foreground">{text}</p>
      </Card>
    </div>
  );
}
