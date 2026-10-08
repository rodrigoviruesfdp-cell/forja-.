"use client";

import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Drawer } from "./drawer";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * iOS action sheet in place of window.confirm(): the question, the action (red when it
 * destroys something) and a separate Cancel, all within thumb reach.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Kept after closing so the sheet does not go blank while it slides away.
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((next) => {
    resolver.current?.(false);
    setOptions(next);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function finish(result: boolean) {
    resolver.current?.(result);
    resolver.current = null;
    setOpen(false);
  }

  return (
    <ConfirmContext value={confirm}>
      {children}
      <Drawer open={open} onOpenChange={(next) => (next ? setOpen(true) : finish(false))} title={options?.title ?? ""} hideTitle>
        {options ? (
          <div className="flex flex-col gap-2 pt-1">
            <div className="overflow-hidden rounded-[12px] bg-surface">
              <div className="flex flex-col gap-1 px-5 py-3.5 text-center">
                <p className="text-footnote font-semibold text-muted-foreground">{options.title}</p>
                {options.message ? <p className="text-footnote text-muted-foreground">{options.message}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => finish(true)}
                className={cn(
                  "h-14 w-full cursor-pointer border-t text-title-3 font-normal active:bg-surface-2",
                  options.destructive ? "text-destructive" : "text-planned",
                )}
              >
                {options.confirmLabel}
              </button>
            </div>
            <button
              type="button"
              onClick={() => finish(false)}
              className="h-14 w-full cursor-pointer rounded-[12px] bg-surface text-title-3 font-semibold text-planned active:bg-surface-2"
            >
              {options.cancelLabel}
            </button>
          </div>
        ) : null}
      </Drawer>
    </ConfirmContext>
  );
}

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}
