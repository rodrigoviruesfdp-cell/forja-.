"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { Drawer as Vaul } from "vaul";
import { cn } from "@/lib/utils";

/** Same duration vaul uses for its own animation. */
const SHEET_ANIMATION_MS = 500;
let openSheets = 0;

/**
 * Tells the page wrapper where the viewport is while a sheet is open, so the iOS
 * "card behind the sheet" effect scales what you are looking at (see globals.css).
 */
function useSheetBackdrop(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const wrapper = document.querySelector<HTMLElement>("[data-vaul-drawer-wrapper]");
    if (!wrapper) return;
    openSheets += 1;
    wrapper.style.setProperty("--sheet-origin", `${window.scrollY}px`);
    wrapper.setAttribute("data-sheet-open", "");
    return () => {
      window.setTimeout(() => {
        openSheets -= 1;
        if (openSheets === 0) wrapper.removeAttribute("data-sheet-open");
      }, SHEET_ANIMATION_MS);
    };
  }, [open]);
}

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Visually hidden title (the content already says what it is). */
  hideTitle?: boolean;
  closeLabel?: string;
  /** Pinned under the scrolling content (e.g. the main button), above the home indicator. */
  footer?: ReactNode;
  /** Taller sheet for lists you search in. */
  tall?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Bottom sheet with native inertia (vaul): drag it down to close, the page behind
 * scales back like on iOS. Translucent material, 28px corners, grabber on top.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  closeLabel,
  footer,
  tall = false,
  className,
  children,
}: DrawerProps) {
  useSheetBackdrop(open);

  return (
    <Vaul.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <Vaul.Portal>
        <Vaul.Overlay className="fixed inset-0 z-50 bg-black/35" />
        <Vaul.Content
          aria-describedby={undefined}
          className={cn(
            "material-thick fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-lg flex-col rounded-t-[28px] border border-b-0 outline-none",
            tall ? "h-[92dvh]" : "max-h-[88dvh]",
            className,
          )}
        >
          <div aria-hidden className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-foreground/25" />
          <div className={cn("flex shrink-0 items-center gap-3 px-4", hideTitle && !closeLabel ? "h-2" : "min-h-12")}>
            <Vaul.Title className={cn("min-w-0 flex-1 truncate text-headline", hideTitle && "sr-only")}>{title}</Vaul.Title>
            {closeLabel ? (
              <Vaul.Close
                aria-label={closeLabel}
                className="relative touch-target flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-2 text-muted-foreground"
              >
                <X className="size-4" strokeWidth={2.6} />
              </Vaul.Close>
            ) : null}
          </div>
          <div className={cn("min-h-0 flex-1 overflow-y-auto px-4", footer ? "pb-3" : "pb-[max(env(safe-area-inset-bottom),1rem)]")}>
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]">{footer}</div>
          ) : null}
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}
