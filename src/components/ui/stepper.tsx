"use client";

import { Minus, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  className?: string;
}

/** iOS stepper (− | +) with the value beside it; the number rolls when it changes. */
export function Stepper({ value, min, max, onChange, decreaseLabel, increaseLabel, className }: StepperProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="numeric relative flex h-8 min-w-8 justify-end overflow-hidden text-title-3" aria-live="polite">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: -14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 14, opacity: 0 }}
            className="block leading-8"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <div className="flex h-9 overflow-hidden rounded-[10px] bg-surface-2">
        <motion.button
          type="button"
          aria-label={decreaseLabel}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          whileTap={{ scale: 0.9 }}
          className="flex w-12 cursor-pointer items-center justify-center disabled:opacity-30"
        >
          <Minus className="size-[18px]" strokeWidth={2.4} />
        </motion.button>
        <span aria-hidden className="my-2 w-px bg-separator" />
        <motion.button
          type="button"
          aria-label={increaseLabel}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          whileTap={{ scale: 0.9 }}
          className="flex w-12 cursor-pointer items-center justify-center disabled:opacity-30"
        >
          <Plus className="size-[18px]" strokeWidth={2.4} />
        </motion.button>
      </div>
    </div>
  );
}
