"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { SPRING } from "./spring";

/**
 * Every motion component springs by default, and "Reduce motion" (iOS/Android setting)
 * turns movement into plain fades.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig transition={SPRING} reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
