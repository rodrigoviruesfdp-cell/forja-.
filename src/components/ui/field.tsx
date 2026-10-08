import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="px-1 text-footnote text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="px-1 text-footnote text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
