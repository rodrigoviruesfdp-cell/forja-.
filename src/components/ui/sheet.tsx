"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  className?: string;
}

/** Bottom sheet: slides up from the bottom, within thumb reach. */
export function Sheet({ open, onOpenChange, title, closeLabel, children, className }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] max-w-lg flex-col rounded-t-xl border-t bg-surface pb-safe",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
            className,
          )}
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
            <Dialog.Title className="heading text-xl">{title}</Dialog.Title>
            <Dialog.Close
              aria-label={closeLabel}
              className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-4 pb-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
