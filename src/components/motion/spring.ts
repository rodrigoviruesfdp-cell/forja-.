import type { Transition } from "motion/react";

/** The app's one spring: quick, with a hint of overshoot. Default for every motion component. */
export const SPRING = { type: "spring", stiffness: 350, damping: 25, mass: 0.8 } as const satisfies Transition;

/** Press feedback for buttons and tappable cards (the visual stand-in for a haptic). */
export const PRESS = { whileTap: { scale: 0.96 }, whileHover: { scale: 1.01 } } as const;

/** Gentler press for wide elements (full-width cards), where 4% would move the edges too much. */
export const PRESS_SOFT = { whileTap: { scale: 0.98 }, whileHover: { scale: 1.005 } } as const;

/** Lists and card groups enter one after another, rising 8px while fading in. */
export const STAGGER = 0.04;
