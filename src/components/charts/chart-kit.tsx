"use client";

import type { ReactNode } from "react";

/** Paleta categórica validada (orden fijo, nunca ciclado). */
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
export const AXIS = { stroke: "#94a3b8", fontSize: 11, tickLine: false, axisLine: false } as const;
export const GRID = { stroke: "#eef1f6", vertical: false } as const;

interface TooltipPayload {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

export function ChartTooltip({ active, payload, label, format }: { active?: boolean; payload?: TooltipPayload[]; label?: ReactNode; format?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <p className="mb-1 font-semibold text-fg">{label}</p>}
      {payload.map((p) => (
        <p key={String(p.name)} className="flex items-center gap-2 text-fg-muted">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <b className="text-fg tabular-nums">{format && typeof p.value === "number" ? format(p.value) : p.value}</b>
        </p>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
