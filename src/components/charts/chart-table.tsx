"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

interface ChartTableProps {
  /** "Ver datos" */
  label: string;
  columns: string[];
  rows: { key: string; cells: string[] }[];
}

/** The chart's numbers as a table, behind a disclosure (every value readable without hovering). */
export function ChartTable({ label, columns, rows }: ChartTableProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 cursor-pointer items-center gap-1 self-start text-footnote font-medium text-planned"
      >
        {label}
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="flex">
          <ChevronDown className="size-4" strokeWidth={2.4} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-footnote">
                <thead className="sticky top-0 bg-surface text-muted-foreground">
                  <tr>
                    {columns.map((column, i) => (
                      <th key={column} scope="col" className={cn("py-1.5 font-medium", i === 0 ? "text-left" : "text-right")}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-t border-separator">
                      {row.cells.map((cell, i) =>
                        i === 0 ? (
                          <th key={i} scope="row" className="py-1.5 text-left font-normal">
                            {cell}
                          </th>
                        ) : (
                          <td key={i} className="py-1.5 text-right tabular-nums">
                            {cell}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
