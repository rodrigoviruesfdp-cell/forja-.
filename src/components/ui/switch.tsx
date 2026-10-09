"use client";

import { motion } from "motion/react";
import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** iOS switch: green when on, the knob springs across. 51×31 like UISwitch. */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer relative touch-target flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full bg-surface-3 p-[2px] data-[state=checked]:justify-end data-[state=checked]:bg-done disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb asChild>
        <motion.span
          layout
          className="block size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_3px_1px_rgb(0_0_0/0.06)]"
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}
