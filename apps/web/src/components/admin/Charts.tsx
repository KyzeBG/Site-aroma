"use client";

import { cn } from "@/lib/cn";

export function Sparkline({
  values,
  className
}: {
  values: number[];
  className?: string;
}) {
  const w = 120;
  const h = 36;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = Math.max(1, max - min);

  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * (w - 2) + 1;
      const y = h - ((v - min) / range) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("text-accent", className)}
      role="img"
      aria-label="Tendência"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
      />
    </svg>
  );
}

export function MiniBarChart({
  values,
  className
}: {
  values: number[];
  className?: string;
}) {
  const w = 160;
  const h = 54;
  const max = Math.max(1, ...values);
  const barW = w / values.length;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("text-accent", className)}
      role="img"
      aria-label="Distribuição"
    >
      {values.map((v, i) => {
        const bh = (v / max) * (h - 6);
        const x = i * barW + 2;
        const y = h - bh - 2;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={Math.max(2, barW - 4)}
            height={bh}
            rx="3"
            fill="currentColor"
            opacity={0.9}
          />
        );
      })}
    </svg>
  );
}

