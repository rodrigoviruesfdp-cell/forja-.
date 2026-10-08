"use client";

import { motion } from "motion/react";

export interface BarListItem {
  key: string;
  label: string;
  value: number;
  /** The value as shown at the tip of the bar. */
  display: string;
}

/**
 * Horizontal bars, one per row, all the same colour (one series), each with its value at the
 * tip. For rankings like "sets per muscle".
 */
export function BarList({ items, ariaLabel }: { items: BarListItem[]; ariaLabel: string }) {
  const max = Math.max(...items.map((item) => item.value), 0) || 1;
  return (
    <ul aria-label={ariaLabel} className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.key} className="grid grid-cols-[6.5rem_1fr] items-center gap-3">
          <span className="truncate text-footnote">{item.label}</span>
          <span className="flex items-center gap-2">
            <motion.span
              aria-hidden
              className="h-2.5 rounded-r-[4px] bg-chart-1"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max((item.value / max) * 78, 1.5)}%` }}
            />
            <span className="shrink-0 text-footnote font-semibold tabular-nums">{item.display}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
