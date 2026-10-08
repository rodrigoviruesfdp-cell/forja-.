"use client";

import { useId, useRef, useState } from "react";
import { dateOf } from "@/domain/dates";
import { niceTicks, useElementWidth } from "./chart-utils";

export interface LinePoint {
  key: string;
  /** yyyy-mm-dd: points are placed by date. */
  date: string;
  value: number;
  /** For the readout: the date, and what the value came from ("70 kg × 5"). */
  label: string;
  detail?: string;
  /** A record: drawn in the record colour, bigger, and named in the readout. */
  highlight?: boolean;
}

interface LineChartProps {
  points: LinePoint[];
  format: (value: number) => string;
  formatAxis?: (value: number) => string;
  /** "Récord" */
  highlightLabel: string;
  /** Ticks under the axis: first and last date. */
  formatDate: (date: string) => string;
  ariaLabel: string;
  height?: number;
}

const AXIS_WIDTH = 44;
const TICK_BAND = 22;
const END_PAD = 12;
/** Past this many points, only records and the last point keep their dot. */
const MAX_DOTS = 30;

/**
 * One series over time: a 2px line with a soft wash under it and dots on the sessions (records
 * in red). The readout above shows the latest session; drag or hover and a crosshair snaps to
 * the nearest one and the readout follows it (arrow keys too, with focus).
 */
export function LineChart({ points, format, formatAxis = format, highlightLabel, formatDate, ariaLabel, height = 168 }: LineChartProps) {
  const box = useRef<HTMLDivElement>(null);
  const width = useElementWidth(box);
  const gradient = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [active, setActive] = useState<number | null>(null);

  const values = points.map((point) => point.value);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const low = ticks[0] ?? 0;
  const high = ticks.at(-1) ?? 1;
  const times = points.map((point) => dateOf(point.date).getTime());
  const first = times[0] ?? 0;
  const last = times.at(-1) ?? 0;
  const plotLeft = AXIS_WIDTH;
  const plotRight = Math.max(plotLeft, width - END_PAD - 4);
  const x = (index: number) =>
    points.length === 1 || last === first
      ? (plotLeft + plotRight) / 2
      : plotLeft + (((times[index] ?? first) - first) / (last - first)) * (plotRight - plotLeft);
  const y = (value: number) => 6 + (1 - (value - low) / (high - low || 1)) * (height - 12);
  const line = points.map((point, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(point.value).toFixed(1)}`).join("");
  const area = points.length > 1 ? `${line}L${x(points.length - 1).toFixed(1)},${height}L${x(0).toFixed(1)},${height}Z` : "";
  const dots = points.length <= MAX_DOTS;

  const pick = (clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || points.length === 0) return;
    const pointer = clientX - rect.left;
    let best = 0;
    for (let i = 1; i < points.length; i += 1) if (Math.abs(x(i) - pointer) < Math.abs(x(best) - pointer)) best = i;
    setActive(best);
  };

  const shown = points[active ?? points.length - 1];
  const lastPoint = points.at(-1);

  return (
    <div className="flex flex-col gap-2">
      {shown ? (
        <div aria-live="polite" className="flex min-h-12 flex-col justify-center">
          <p className="font-rounded text-title-2">{format(shown.value)}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-footnote text-muted-foreground">
            <span>{shown.label}</span>
            {shown.detail ? <span>· {shown.detail}</span> : null}
            {shown.highlight ? <span className="font-semibold text-pr">· {highlightLabel}</span> : null}
          </p>
        </div>
      ) : null}

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
          if (event.key === "ArrowRight") setActive((i) => Math.min(points.length - 1, (i ?? points.length - 2) + 1));
          if (event.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? points.length) - 1));
          if (event.key === "Escape") setActive(null);
        }}
      >
        {width > 0 && lastPoint ? (
          <svg width={width} height={height + TICK_BAND} aria-hidden className="block overflow-visible">
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--chart-1)" stopOpacity="0.16" />
                <stop offset="1" stopColor="var(--chart-1)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {ticks.map((value) => {
              const lineY = y(value);
              return (
                <g key={value}>
                  <line x1={plotLeft} x2={width} y1={lineY} y2={lineY} className="stroke-separator" strokeWidth={1} shapeRendering="crispEdges" />
                  <text x={plotLeft - 6} y={lineY + 4} textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                    {formatAxis(value)}
                  </text>
                </g>
              );
            })}
            {area ? <path d={area} fill={`url(#${gradient})`} /> : null}
            <path d={line} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {active !== null ? (
              <line x1={x(active)} x2={x(active)} y1={0} y2={height} className="stroke-muted-foreground" strokeWidth={1} />
            ) : null}
            {points.map((point, i) =>
              dots || point.highlight || i === points.length - 1 || i === active ? (
                <circle
                  key={point.key}
                  cx={x(i)}
                  cy={y(point.value)}
                  r={point.highlight || i === active ? 5 : 4}
                  fill={point.highlight ? "var(--pr)" : "var(--chart-1)"}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              ) : null,
            )}
            <text x={plotLeft} y={height + 16} className="fill-muted-foreground text-[11px]">
              {formatDate(points[0]?.date ?? "")}
            </text>
            {points.length > 1 ? (
              <text x={plotRight} y={height + 16} textAnchor="end" className="fill-muted-foreground text-[11px]">
                {formatDate(lastPoint.date)}
              </text>
            ) : null}
          </svg>
        ) : (
          <div style={{ height: height + TICK_BAND }} />
        )}
      </div>
    </div>
  );
}
