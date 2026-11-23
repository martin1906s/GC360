import type { ReactNode } from "react";
import { TONE_CLASSES, type Meta, type Tone } from "@/domain/constants";
import { cn } from "@/lib/utils";

export function Badge({ tone = "slate", children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  const t = TONE_CLASSES[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", t.bg, t.text, t.ring, className)}>
      {dot && <span className={cn("size-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}

export function MetaBadge<K extends string>({ map, value, dot = true }: { map: Record<K, Meta>; value: K; dot?: boolean }) {
  const m = map[value];
  if (!m) return <Badge>{value}</Badge>;
  return <Badge tone={m.tone} dot={dot}>{m.label}</Badge>;
}

/** Marca visible de integración demostrativa (criterio de aceptación 17). */
export function DemoTag({ label = "Simulado", className }: { label?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border border-dashed border-amber-300 bg-amber-50 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-700", className)}>
      {label}
    </span>
  );
}
