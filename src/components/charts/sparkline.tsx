/** A tiny trend line for list rows: muted line, the latest point in the accent colour. */
export function Sparkline({ values, width = 64, height = 24 }: { values: number[]; width?: number; height?: number }) {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i: number) => (values.length === 1 ? width / 2 : 3 + (i / (values.length - 1)) * (width - 6));
  const y = (v: number) => (max === min ? height / 2 : 3 + (1 - (v - min) / (max - min)) * (height - 6));
  const path = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const last = values.length - 1;
  return (
    <svg width={width} height={height} aria-hidden className="shrink-0 overflow-visible">
      {values.length > 1 ? (
        <path d={path} fill="none" className="stroke-tertiary-foreground" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      ) : null}
      <circle cx={x(last)} cy={y(values[last] ?? 0)} r={3} fill="var(--chart-1)" />
    </svg>
  );
}
