"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ open, onClose, title, description, children, footer, size = "md" }: Props) {
  useEsc(open, onClose);
  if (!open || typeof document === "undefined") return null;
  const w = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-4 pt-[8vh] backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className={cn("w-full animate-fade-in rounded-xl bg-white shadow-2xl", w)} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-fg-subtle hover:bg-slate-100 hover:text-fg">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 scroll-thin">{children}</div>
        {footer && <div className="flex justify-end gap-2 rounded-b-2xl border-t bg-slate-50/70 px-6 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Sheet({ open, onClose, title, description, children, footer, width = "max-w-md" }: Omit<Props, "size"> & { width?: string }) {
  useEsc(open, onClose);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-950/30" onMouseDown={onClose}>
      <aside className={cn("absolute inset-y-0 right-0 flex w-full animate-slide-in-right flex-col bg-white shadow-2xl", width)} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-fg-subtle hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 scroll-thin">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t px-5 py-3">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}
