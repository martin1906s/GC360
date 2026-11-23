"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Menu({ trigger, children, align = "right", width = "w-56" }: { trigger: (open: boolean) => ReactNode; children: (close: () => void) => ReactNode; align?: "left" | "right"; width?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(!open)}>{trigger(open)}</div>
      {open && (
        <div className={cn("absolute z-40 mt-1.5 animate-fade-in rounded-lg border bg-white p-1 shadow-xl", width, align === "right" ? "right-0" : "left-0")}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ children, onClick, icon, danger, active, hint }: { children: ReactNode; onClick?: () => void; icon?: ReactNode; danger?: boolean; active?: boolean; hint?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition [&_svg]:size-4",
        danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-100",
        active && "bg-brand-50 text-brand-700",
      )}
    >
      {icon && <span className="text-fg-subtle">{icon}</span>}
      <span className="min-w-0 flex-1">{children}</span>
      {hint && <span className="text-[11px] text-fg-subtle">{hint}</span>}
    </button>
  );
}

export const MenuLabel = ({ children }: { children: ReactNode }) => <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{children}</div>;
export const MenuSep = () => <div className="my-1 h-px bg-border" />;
