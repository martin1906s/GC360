"use client";

import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { BotMessageSquare, X } from "lucide-react";
import { useSession } from "@/store/session";
import { AIChat } from "@/components/ai/ai-chat";
import { QUICK_LINKS } from "@/config/navigation";

const CONTEXT_SUGGESTIONS: Record<string, string[]> = {
  "/bandeja": ["Casos pendientes más de 48 horas", "Carga de casos por asesor", "Siniestros abiertos"],
  "/casos": ["Casos pendientes más de 48 horas", "Carga de casos por asesor", "Siniestros abiertos"],
  "/polizas": ["¿Cuáles son las pólizas por vencer?", "Cuotas vencidas en cartera", "Resumen de comisiones"],
  "/renovaciones": ["¿Cuáles son las pólizas por vencer?", "Siniestros abiertos"],
  "/financiero": ["Resumen de comisiones", "Cuotas vencidas en cartera"],
  "/comercial": ["Estado del pipeline comercial", "Carga de casos por asesor"],
  "/crm": ["Estado del pipeline comercial", "Resumen de Camilo Herrera"],
};

/** Asistente contextual disponible en toda la plataforma. */
export function CopilotPanel() {
  const open = useSession((s) => s.copilotOpen);
  const setOpen = useSession((s) => s.setCopilot);
  const path = usePathname();
  if (!open || typeof document === "undefined") return null;
  const page = QUICK_LINKS.find((l) => (l.href === "/" ? path === "/" : path.startsWith(l.href)));
  const key = Object.keys(CONTEXT_SUGGESTIONS).find((k) => path.startsWith(k));
  return createPortal(
    <aside className="no-print fixed inset-y-0 right-0 z-40 flex w-full max-w-md animate-slide-in-right flex-col border-l bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b bg-surface-muted px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-ink-900 text-white">
            <BotMessageSquare className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Asistente GC360</p>
            <p className="text-[11px] text-fg-muted">Contexto: {page?.label ?? "Plataforma"}</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="rounded-md p-1 text-fg-muted hover:bg-white">
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <AIChat key={path} compact context={page?.label} suggestions={key ? CONTEXT_SUGGESTIONS[key] : undefined} />
      </div>
    </aside>,
    document.body,
  );
}
