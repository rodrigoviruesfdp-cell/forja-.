"use client";

import { type RefObject, useEffect, useState } from "react";

/** The width of an element, kept up to date (charts draw at their real size). */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * A round number at or above `value` whose half is round too (1, 2, 4, 6, 8 × a power of ten),
 * for the top of a column chart with a gridline in the middle.
 */
export function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 4, 6, 8, 10].find((factor) => factor * power >= value - 1e-9) ?? 10;
  return step * power;
}

/** A round step (1, 2 or 5 × a power of ten) for about `count` intervals. */
function niceStep(span: number, count: number): number {
  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 5, 10].find((factor) => factor * power >= raw) ?? 10) * power;
}

/**
 * Round ticks from below `min` to above `max` (for lines, which need not start at zero):
 * 80 · 100 · 120, never 87,5 · 112,5.
 */
export function niceTicks(min: number, max: number, count = 3): number[] {
  const span = max - min || Math.max(1, Math.abs(max) * 0.2);
  const step = niceStep(span, count);
  const low = Math.max(0, Math.floor((min - span * 0.05) / step) * step);
  const high = Math.ceil((max + span * 0.05) / step) * step;
  const ticks: number[] = [];
  for (let value = low; value <= high + step / 2; value += step) ticks.push(Math.round(value * 1e6) / 1e6);
  return ticks.length > 1 ? ticks : [low, low + step];
}

/** Path of a column with a 4px rounded top and a square base. */
export function columnPath(x: number, y: number, width: number, height: number, radius = 4): string {
  if (height <= 0) return "";
  const r = Math.min(radius, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}
