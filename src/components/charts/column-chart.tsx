"use client";

import { type ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { columnPath, niceCeil, useElementWidth } from "./chart-utils";

export interface ChartSeries {
  label: string;
  /** A CSS colour (a var(--chart-n) token). */
  color: string;
}

export interface ChartColumn {
  key: string;
  /** Under the column ("14 sep"). Only some are shown when they would collide. */
  tick: string;
  /** In the readout ("Semana del 14 de septiembre"). */
  label: string;
  /** One value per series, stacked from the bottom. */
  values: number[];
}

interface ColumnChartProps {
  columns: ChartColumn[];
  series: ChartSeries[];
  format: (value: number) => string;
  /** Short numbers for the axis ("1 mil"). */
  formatAxis?: (value: number) => string;
  /** The top of the axis for the tallest column (defaults to a round number above it). */
  ceil?: (max: number) => number;
  /** "Total" in the readout of a stacked chart. */
  totalLabel?: string;
  /** What the readout shows while no column is chosen (an average, a hint). */
  summary?: ReactNode;
  ariaLabel: string;
  height?: number;
}

const AXIS_WIDTH = 40;
const TICK_BAND = 22;
const GAP = 2;

/**
 * Columns over time (one series, or two stacked), thin with 4px rounded tops. Tap or hover a
 * column and the readout above the chart shows its numbers (like the Health app); arrow keys
 * move between columns when the chart has focus.
 */
export function ColumnChart({
  columns,
  series,
  format,
  formatAxis = format,
  ceil = niceCeil,
  totalLabel,
  summary,
  ariaLabel,
  height = 160,
}: ColumnChartProps) {
  const box = useRef<HTMLDivElement>(null);
  const width = useElementWidth(box);
  const [active, setActive] = useState<number | null>(null);

  const totals = columns.map((column) => column.values.reduce((sum, value) => sum + value, 0));
  const max = ceil(Math.max(...totals, 0));
  const plotWidth = Math.max(0, width - AXIS_WIDTH);
  const band = columns.length > 0 ? plotWidth / columns.length : 0;
  const barWidth = Math.max(2, Math.min(24, band * 0.62));
  const y = (value: number) => height - (value / max) * height;
  // Ticks at least ~44px apart.
  const tickEvery = Math.max(1, Math.ceil(44 / Math.max(band, 1)));

  const pick = (clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || band === 0) return;
    const index = Math.floor((clientX - rect.left - AXIS_WIDTH) / band);
    setActive(Math.min(columns.length - 1, Math.max(0, index)));
  };

  const shown = active !== null ? columns[active] : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div aria-live="polite" className="flex min-h-11 flex-col justify-center">
        {shown ? (
          <>
            <p className="flex items-baseline justify-between gap-3">
              <span className="truncate text-footnote text-muted-foreground">{shown.label}</span>
              <span className="shrink-0 font-rounded text-headline whitespace-nowrap">
                {series.length > 1 && totalLabel ? `${totalLabel} ` : ""}
                {format(totals[active ?? 0] ?? 0)}
              </span>
            </p>
            {series.length > 1 ? (
              <p className="flex flex-wrap gap-x-4 text-footnote">
                {series.map((item, i) => (
                  <span key={item.label} className="flex items-center gap-1.5 whitespace-nowrap">
                    <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: item.color }} />
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold">{format(shown.values[i] ?? 0)}</span>
                  </span>
                ))}
              </p>
            ) : null}
          </>
        ) : (
          summary
        )}
      </div>

      <div
        ref={box}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        className="relative touch-pan-y rounded-md outline-none select-none focus-visible:ring-2 focus-visible:ring-ring"
        onPointerMove={(event) => pick(event.clientX)}
        onPointerDown={(event) => pick(event.clientX)}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setActive(null);
        }}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") setActive((i) => Math.min(columns.length - 1, (i ?? -1) + 1));
          if (event.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? columns.length) - 1));
          if (event.key === "Escape") setActive(null);
        }}
      >
        {width > 0 ? (
          <svg width={width} height={height + TICK_BAND} aria-hidden className="block overflow-visible">
            {[0, 0.5, 1].map((fraction) => {
              const value = max * fraction;
              const lineY = y(value);
              return (
                <g key={fraction}>
                  <line x1={AXIS_WIDTH} x2={width} y1={lineY} y2={lineY} className="stroke-separator" strokeWidth={1} shapeRendering="crispEdges" />
                  <text x={AXIS_WIDTH - 6} y={lineY + 4} textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                    {formatAxis(value)}
                  </text>
                </g>
              );
            })}
            {columns.map((column, index) => {
              const x = AXIS_WIDTH + band * index + (band - barWidth) / 2;
              let base = 0;
              const top = column.values.reduce((last, value, i) => (value > 0 ? i : last), -1);
              return (
                <g key={column.key} opacity={active === null || active === index ? 1 : 0.4}>
                  {column.values.map((value, i) => {
                    if (value <= 0) return null;
                    const segmentTop = y(base + value);
                    const segmentBottom = y(base) - (base > 0 ? GAP : 0);
                    base += value;
                    const segmentHeight = Math.max(1, segmentBottom - segmentTop);
                    const color = series[i]?.color ?? "currentColor";
                    return i === top ? (
                      <path key={i} d={columnPath(x, segmentTop, barWidth, segmentHeight)} fill={color} />
                    ) : (
                      <rect key={i} x={x} y={segmentTop} width={barWidth} height={segmentHeight} fill={color} />
                    );
                  })}
                  {index % tickEvery === 0 ? (
                    <text
                      x={AXIS_WIDTH + band * (index + 0.5)}
                      y={height + 16}
                      textAnchor="middle"
                      className={cn("text-[11px]", active === index ? "fill-foreground" : "fill-muted-foreground")}
                    >
                      {column.tick}
                    </text>
                  ) : null}
                </g>
              );
            })}
            <line x1={AXIS_WIDTH} x2={width} y1={height} y2={height} className="stroke-separator" strokeWidth={1} shapeRendering="crispEdges" />
          </svg>
        ) : (
          <div style={{ height: height + TICK_BAND }} />
        )}
      </div>
    </div>
  );
}

/** Legend: a swatch (the mark's shape) and the name, in text colour. */
export function ChartLegend({ series }: { series: ChartSeries[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-footnote text-muted-foreground">
      {series.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
