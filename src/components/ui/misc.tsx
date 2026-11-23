"use client";

import { useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Inbox } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { TONE_CLASSES, type Tone } from "@/domain/constants";

export function PageHeader({ title, description, actions, eyebrow, children }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-fg-muted">{eyebrow}</div>}
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Avatar({ name, color, size = "md", className }: { name: string; color?: string; size?: "xs" | "sm" | "md" | "lg"; className?: string }) {
  const s = { xs: "size-5 text-[9px]", sm: "size-7 text-[11px]", md: "size-9 text-xs", lg: "size-12 text-base" }[size];
  return (
    <span className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-white", s, className)} style={{ background: color ?? "#64748b" }} title={name}>
      {initials(name)}
    </span>
  );
}

export function KpiCard({ label, value, delta, hint, icon, tone = "blue", onClick }: { label: string; value: ReactNode; delta?: number; hint?: ReactNode; icon?: ReactNode; tone?: Tone; onClick?: () => void }) {
  const t = TONE_CLASSES[tone];
  return (
    <div onClick={onClick} className={cn("group relative overflow-hidden rounded-lg border bg-surface p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]", onClick && "cursor-pointer transition hover:border-brand-200 hover:shadow-md")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-snug text-fg-muted">{label}</p>
        {icon && <div className={cn("grid size-8 place-items-center rounded-lg [&_svg]:size-4", t.bg, t.text)}>{icon}</div>}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span className={cn("inline-flex items-center gap-0.5 font-medium", delta >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(delta)}%
          </span>
        )}
        {hint && <span className="text-fg-subtle">{hint}</span>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-400 [&_svg]:size-6">{icon ?? <Inbox />}</div>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Progress({ value, tone = "blue", className }: { value: number; tone?: Tone; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div className={cn("h-full rounded-full transition-all", TONE_CLASSES[tone].solid)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Tabs<K extends string>({ tabs, value, onChange, className }: { tabs: { key: K; label: ReactNode; count?: number }[]; value: K; onChange: (k: K) => void; className?: string }) {
  return (
    <div className={cn("flex gap-1 overflow-x-auto border-b scroll-thin", className)}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition",
            value === t.key ? "text-brand-700" : "text-fg-muted hover:text-fg",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", value === t.key ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-fg-muted")}>{t.count}</span>}
          {value === t.key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
        </button>
      ))}
    </div>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: ReactNode }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {options.map((o) => (
        <button key={o.key} onClick={() => onChange(o.key)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition", value === o.key ? "bg-white text-fg shadow-sm" : "text-fg-muted hover:text-fg")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export interface TimelineItem {
  id: string;
  at: string;
  title: ReactNode;
  body?: ReactNode;
  actor: string;
  actorType: "usuario" | "ia" | "sistema" | "cliente";
}

const ACTOR_TONE: Record<TimelineItem["actorType"], string> = {
  usuario: "bg-brand-500",
  ia: "bg-brand-500",
  sistema: "bg-slate-400",
  cliente: "bg-emerald-500",
};

export function Timeline({ items, format }: { items: TimelineItem[]; format: (d: string) => string }) {
  return (
    <ol className="relative space-y-4 pl-5 before:absolute before:inset-y-1 before:left-[5px] before:w-px before:bg-border">
      {items.map((it) => (
        <li key={it.id} className="relative animate-fade-in">
          <span className={cn("absolute -left-5 top-1 size-[11px] rounded-full ring-4 ring-white", ACTOR_TONE[it.actorType])} />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="text-[13px] font-medium">{it.title}</p>
            <span className="text-[11px] text-fg-subtle">{format(it.at)}</span>
          </div>
          {it.body && <p className="mt-0.5 text-[13px] leading-relaxed text-fg-muted">{it.body}</p>}
          <p className="mt-0.5 text-[11px] text-fg-subtle">
            {it.actorType === "ia" ? "" : ""}
            {it.actor}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function Stat({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-fg">{value}</dd>
    </div>
  );
}

export function Collapsible({ title, children, defaultOpen = false }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border">
      <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium" onClick={() => setOpen(!open)}>
        {title}
        <span className="text-fg-subtle">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="border-t px-3 py-2">{children}</div>}
    </div>
  );
}
